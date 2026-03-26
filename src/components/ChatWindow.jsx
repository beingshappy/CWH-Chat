import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiPhone, FiVideo, FiInfo, FiChevronLeft, FiSearch, FiMoreVertical } from 'react-icons/fi';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ForwardModal from './ForwardModal';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSkeleton } from './Skeletons';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  startAfter, 
  getDocs,
  where,
  doc,
  writeBatch
} from 'firebase/firestore';
import { isActuallyOnline, formatLastSeen } from '../utils/presence';

// ... (helpers same as before)


// ----- helpers -----
const formatDateLabel = (timestamp) => {
  if (!timestamp) return null;
  const date = timestamp.toDate();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

const isSameDay = (ts1, ts2) => {
  if (!ts1 || !ts2) return false;
  return ts1.toDate().toDateString() === ts2.toDate().toDateString();
};

const isSameSenderAndClose = (msg, prevMsg) => {
  if (!prevMsg) return false;
  if (msg.senderId !== prevMsg.senderId) return false;
  if (!msg.timestamp || !prevMsg.timestamp) return false;
  const diff = msg.timestamp.toDate() - prevMsg.timestamp.toDate();
  return diff < 5 * 60 * 1000; // group within 5 mins
};

// ----- component -----
const ChatWindow = ({ activeChat, toggleInfo }) => {
  const [messages, setMessages] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const { sendMessage, typingUsers, setTyping, startCall, users, setActiveChat, toggleMuteChat, updateChatWallpaper, currentUserProfile } = useChat();
  const { currentUser } = useAuth();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with soft keyboard via VisualViewport
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const height = window.innerHeight - window.visualViewport.height;
      setKeyboardHeight(height > 0 ? height : 0);
      
      // Force scroll to bottom when keyboard opens
      // Use setTimeout to ensure React has painted the new paddingBottom into the DOM FIRST!
      if (height > 50) {
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Find recipient object for robust online status
  const otherParticipant = activeChat.isGroup ? null : users.find(u => u.id === (activeChat.otherUserId || activeChat.id));
  const isRecipientOnline = activeChat.isGroup ? false : isActuallyOnline(otherParticipant);

  const currentTypingInChat = Object.values(typingUsers).filter(
    t => t.chatId === activeChat?.id
  );
  const isTyping = currentTypingInChat.length > 0;
  const typingNames = currentTypingInChat.map(t => t.userName);

  const PAGE_SIZE = 30;

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Mark messages as read
  useEffect(() => {
    if (!activeChat || !currentUser) return;

    const markAsRead = async () => {
      // 1. Mark individual messages as read (for ticks)
      const q = query(
        collection(db, 'chats', activeChat.id, 'messages'),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      if (!snapshot.empty) {
        snapshot.docs.forEach((msgDoc) => {
          // Filter senderId in memory to avoid composite index requirement
          if (msgDoc.data().senderId !== currentUser.uid) {
            batch.update(msgDoc.ref, { read: true });
          }
        });
      }

      // 2. Clear unread count for current user in the chat doc
      batch.update(doc(db, 'chats', activeChat.id), {
        [`unreadCount.${currentUser.uid}`]: 0
      });

      await batch.commit();
    };

    markAsRead();
  }, [activeChat, currentUser, messages.length]);

  useEffect(() => {
    if (!activeChat) return;

    // Initial subscription for last PAGE_SIZE messages
    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
      });
      setMessages(msgs.reverse());
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoadingInitial(false);
      
      // Auto scroll if user is near bottom or we just sent a message
      if (containerRef.current) {
        const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        if (isNearBottom) {
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      }
    });

    return unsubscribe;
  }, [activeChat]);

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !messages.length) return;
    setLoadingMore(true);

    // Save current scroll height to maintain position
    const currentHeight = containerRef.current.scrollHeight;

    const firstMsg = messages[0];
    if (!firstMsg.timestamp) {
        setLoadingMore(false);
        return;
    }

    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('timestamp', 'desc'),
      startAfter(firstMsg.timestamp),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    const oldMsgs = [];
    snapshot.forEach(doc => {
      oldMsgs.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
    });

    if (oldMsgs.length > 0) {
      setMessages(prev => [...oldMsgs.reverse(), ...prev]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      
      // Keep scroll position
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - currentHeight;
        }
      });
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const handleScroll = (e) => {
    // Pre-fetching: Load more when user is 300px from top
    if (e.target.scrollTop < 300 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    if (!loadingInitial && messages.length > 0) {
      setTimeout(() => scrollToBottom('auto'), 50);
    }
  }, [loadingInitial, activeChat]);

  const handleSendMessage = async (text, file, replyData) => {
    if (!activeChat) return;
    try {
      await sendMessage(activeChat.id, text, file, replyData);
    } catch (error) {
      console.error('Failed to send', error);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleTyping = (isTyping) => {
    if (!activeChat) return;
    setTyping(activeChat.id, isTyping);
  };

  const filteredMessages = searchQuery.trim() 
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const userWallpaper = activeChat.wallpapers?.[currentUser?.uid];
  const isBlocked = !activeChat.isGroup && (currentUserProfile?.blockedUsers?.includes(activeChat.otherUserId || activeChat.id) || users.find(u => u.id === (activeChat.otherUserId || activeChat.id))?.blockedUsers?.includes(currentUser?.uid));

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <div 
      className="flex-1 flex flex-col h-full relative"
      style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0 }}
    >
      {/* Dynamic Chat Wallpaper */}
      {userWallpaper && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-all duration-700"
          style={{ 
            backgroundImage: `url(${userWallpaper})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
          }}
        >
          {/* Mobile-friendly overlay instead of expensive CSS filter */}
          <div className="absolute inset-0 bg-black/40 md:hidden" />
          <div className="absolute inset-0 hidden md:block backdrop-brightness-[0.7]" />
        </div>
      )}
      {/* Mobile More Menu - MOVED TO TOP LEVEL TO PREVENT CLIPPING */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <div className="fixed inset-0 z-[990] bg-black/40 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed top-20 right-4 w-56 bg-[#0a0c10]/95 md:backdrop-blur-3xl border border-white/5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[1000] overflow-hidden sm:hidden"
            >
              <button 
                onClick={() => { setIsSearchOpen(true); setShowMoreMenu(false); }}
                className="w-full flex items-center space-x-3 px-5 py-4 text-sm text-text-main hover:bg-white/5 transition-colors"
              >
                <FiSearch className="w-5 h-5 text-primary-400" />
                <span className="font-medium">Search Messages</span>
              </button>
              <button 
                onClick={() => { toggleInfo(); setShowMoreMenu(false); }}
                className="w-full flex items-center space-x-3 px-5 py-4 text-sm text-text-main hover:bg-white/5 transition-colors border-t border-white/5"
              >
                <FiInfo className="w-5 h-5 text-primary-400" />
                <span className="font-medium">View Info</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Header */}
      <div className="relative z-[60]">
        <div className="h-16 px-4 flex items-center justify-between bg-sidebar-premium border-b border-glass-border">
          <div className="flex items-center space-x-3 min-w-0">
            <motion.button
              onClick={() => setActiveChat(null)}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-2 text-text-muted hover:text-text-main rounded-full transition-colors -ml-2"
            >
              <FiChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center space-x-3 cursor-pointer min-w-0" onClick={toggleInfo}>
              <div className="relative flex-shrink-0">
                <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover border border-white/5 shadow-lg" />
                {isRecipientOnline && !isBlocked && <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-bg-surface shadow-glow" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm text-text-main font-semibold truncate leading-none">{activeChat.name}</h2>
                <p className="text-[10px] text-primary-500/70 font-medium mt-1 whitespace-nowrap truncate max-w-[150px] sm:max-w-none">
                  {isBlocked ? 'Status Unavailable' : (isTyping ? 'typing...' : (isRecipientOnline ? 'Online' : formatLastSeen(otherParticipant?.lastSeen)))}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 relative">
            {!activeChat.isGroup && (
              <>
                <motion.button 
                  disabled={isBlocked}
                  whileHover={!isBlocked ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                  whileTap={!isBlocked ? { scale: 0.9 } : {}}
                  onClick={() => startCall(activeChat.otherUserId, activeChat.name, 'audio')} 
                  className={`p-2.5 transition-colors rounded-full ${isBlocked ? 'opacity-20 cursor-not-allowed' : 'text-text-muted hover:text-text-main'}`}
                >
                  <FiPhone className="w-5 h-5 sm:w-[21px] sm:h-[21px]" />
                </motion.button>
                <motion.button 
                  disabled={isBlocked}
                  whileHover={!isBlocked ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                  whileTap={!isBlocked ? { scale: 0.9 } : {}}
                  onClick={() => startCall(activeChat.otherUserId, activeChat.name, 'video')} 
                  className={`p-2.5 transition-colors rounded-full ${isBlocked ? 'opacity-20 cursor-not-allowed' : 'text-text-muted hover:text-text-main'}`}
                >
                  <FiVideo className="w-5 h-5 sm:w-[21px] sm:h-[21px]" />
                </motion.button>
                <div className="hidden sm:block w-px h-6 bg-glass-border mx-1" />
              </>
            )}
            
            {/* Desktop Search */}
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchQuery(''); }}
              className={`hidden sm:flex p-2.5 rounded-full transition-colors ${isSearchOpen ? 'text-primary-400 bg-primary-500/10' : 'text-text-muted hover:text-text-main'}`}
              title="Search"
            >
              <FiSearch className="w-5 h-5 sm:w-[21px] sm:h-[21px]" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleInfo} 
              className="hidden sm:flex p-2.5 text-text-muted hover:text-text-main rounded-full transition-colors"
              title="Info"
            >
              <FiInfo className="w-5 h-5 sm:w-[21px] sm:h-[21px]" />
            </motion.button>

            {/* Mobile More Menu Trigger Only */}
            <div className="sm:hidden relative">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`p-2 rounded-full transition-colors ${showMoreMenu ? 'bg-white/10 text-primary-400' : 'text-text-muted'}`}
              >
                <FiMoreVertical className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Inline Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-bg-surface/40 md:backdrop-blur-xl border-b border-glass-border p-3"
            >
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
                <input 
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-bg-base/30 border border-glass-border rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-primary-500/30 transition-colors"
                />
              </div>
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                className="text-[10px] font-bold text-text-muted hover:text-text-main uppercase tracking-widest px-2 py-1 transition-colors"
              >
                Close
              </button>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages Area */}
      {loadingInitial ? (
        <MessageSkeleton />
      ) : (
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-custom px-4 py-6 flex flex-col space-y-1 relative z-10 min-h-0"
          style={{ overscrollBehaviorY: 'contain' }}
        >
            {loadingMore && (
              <div className="flex justify-center p-2">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {filteredMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                <div className="bg-primary-500/5 p-6 rounded-3xl backdrop-blur-md border border-primary-500/10 shadow-2xl flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4 border border-primary-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                     <span className="text-2xl text-primary-500 opacity-60">{searchQuery ? '🔍' : '🔒'}</span>
                  </div>
                  <p className="text-sm font-bold tracking-wide text-primary-500/80 uppercase">
                    {searchQuery ? 'No Results Found' : 'Encrypted Conversation Started'}
                  </p>
                  <p className="text-[11px] opacity-40 mt-1">
                    {searchQuery ? `Couldn't find any messages containing "${searchQuery}"` : 'Messages are secured with luxury-grade encryption'}
                  </p>
                </div>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const prevMsg = filteredMessages[idx - 1];
                const showDateSep = !isSameDay(msg.timestamp, prevMsg?.timestamp);
                const isGrouped = !showDateSep && isSameSenderAndClose(msg, prevMsg);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSep && msg.timestamp && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center my-4"
                      >
                        <span className="text-[11px] font-medium text-text-muted bg-bg-surface/60 border border-glass-border px-3 py-1 rounded-full backdrop-blur-sm shadow-sm whitespace-nowrap">
                          {formatDateLabel(msg.timestamp)}
                        </span>
                      </motion.div>
                    )}
                    <MessageBubble
                      message={{ ...msg, time: formatMessageTime(msg.timestamp) }}
                      isMe={msg.senderId === currentUser.uid}
                      grouped={isGrouped}
                      chatId={activeChat.id}
                      onForward={(m) => {
                        setForwardingMessage(m);
                        setShowForwardModal(true);
                      }}
                    />
                  </React.Fragment>
                );
              })
            )}

            <AnimatePresence>
              {isTyping && <TypingIndicator users={typingNames} />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}

        <MessageInput 
          onSend={handleSendMessage} 
          onTyping={handleTyping} 
          isBlocked={isBlocked}
        />

      <ForwardModal 
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        message={forwardingMessage || {}}
      />
    </div>
  );
};

export default ChatWindow;
