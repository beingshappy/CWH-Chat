import React, { useState, useRef, useEffect } from 'react';
import { FiPhone, FiVideo, FiInfo, FiChevronLeft } from 'react-icons/fi';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const { sendMessage, typingUsers, setTyping, setActiveChat, startCall } = useChat();
  const { currentUser } = useAuth();

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
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // messages are desc in query, reverse for UI
      setMessages(msgs.reverse());
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      
      // Auto scroll if user is near bottom
      if (containerRef.current) {
        const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 100) {
          setTimeout(() => scrollToBottom('smooth'), 100);
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
      oldMsgs.push({ id: doc.id, ...doc.data() });
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
    if (e.target.scrollTop === 0 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages.length <= PAGE_SIZE) {
      scrollToBottom('auto');
    }
  }, [activeChat]);

  const handleSendMessage = async (text, file) => {
    if (!activeChat) return;
    try {
      await sendMessage(activeChat.id, text, file);
    } catch (error) {
      console.error('Failed to send', error);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTyping = (isTyping) => {
    if (!activeChat) return;
    setTyping(activeChat.id, isTyping);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-base relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

      {/* Chat Header */}
      <div className="h-16 px-2 sm:px-4 flex items-center justify-between bg-bg-surface/80 backdrop-blur-xl border-b border-glass-border z-20">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={() => setActiveChat(null)}
            aria-label="Back to chat list"
            className="md:hidden p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors -ml-2"
          >
            <FiChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0" onClick={toggleInfo}>
            <div className="relative flex-shrink-0">
              <img src={activeChat.avatar} alt={activeChat.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-white/5" />
              {activeChat.online && <span className="absolute bottom-0 right-0 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-green-500 rounded-full border-2 border-slate-900" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base text-text-main font-medium truncate leading-tight">{activeChat.name || (activeChat.isGroup && 'Group Chat')}</h2>
              <p className="text-[10px] sm:text-xs text-text-muted truncate leading-tight">
                {isTyping
                  ? <span className="text-primary-400 animate-pulse">typing…</span>
                  : activeChat.online ? 'Online' : 'Active'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {!activeChat.isGroup && (
            <>
              <button 
                onClick={() => startCall(activeChat.otherUserId, activeChat.name, 'audio')}
                aria-label="Voice call" 
                className="p-1.5 sm:p-2.5 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors"
              >
                <FiPhone className="w-5 h-5" />
              </button>
              <button 
                onClick={() => startCall(activeChat.otherUserId, activeChat.name, 'video')}
                aria-label="Video call" 
                className="p-1.5 sm:p-2.5 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors"
              >
                <FiVideo className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-glass-border mx-1" />
            </>
          )}
          <button onClick={toggleInfo} aria-label="Chat info" className="p-2.5 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
            <FiInfo className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-custom px-2 sm:px-4 py-4 sm:py-6 flex flex-col space-y-1 relative z-10 min-h-0"
      >
        {loadingMore && (
          <div className="flex justify-center p-2">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="bg-slate-800/50 p-4 rounded-2xl backdrop-blur-sm border border-slate-700/50">
              Say hello to start the conversation! 👋
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
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
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 border border-slate-700/40 px-3 py-1 rounded-full backdrop-blur-sm">
                      {formatDateLabel(msg.timestamp)}
                    </span>
                  </motion.div>
                )}
                <MessageBubble
                  message={{ ...msg, time: formatMessageTime(msg.timestamp) }}
                  isMe={msg.senderId === currentUser.uid}
                  grouped={isGrouped}
                  chatId={activeChat.id}
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

      <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
    </div>
  );
};

export default ChatWindow;
