import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiAnchor, FiBellOff, FiCheckCircle } from 'react-icons/fi';
import UserAvatar from './UserAvatar';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

const formatChatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const ChatItemMemo = ({ chat, active, onClick, isGlobalDirectory = false }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const longPressTimer = useRef(null);
  const { togglePinChat, toggleMuteChat, deleteChat, showPopup } = useChat();
  const { currentUser } = useAuth();
  
  // Cleanup timer
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }, []);

  const isPinned = chat.pinnedBy?.includes(currentUser?.uid);
  const isMuted = chat.mutedBy?.includes(currentUser?.uid);

  const handleDelete = (e) => {
    e.stopPropagation();
    showPopup({
      title: 'Delete Chat?',
      message: `Are you sure you want to delete the chat with ${chat.name}?`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await deleteChat(chat.id);
        } catch (err) {
          console.error('Delete failed:', err);
        }
      }
    });
  };

  const handleTogglePin = (e) => {
    e.stopPropagation();
    togglePinChat(chat.id);
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    toggleMuteChat(chat.id);
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowMobileMenu(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  return (
    <>
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[110] bg-bg-surface rounded-t-3xl p-6 flex flex-col items-center space-y-4 md:hidden border-t border-glass-border shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-bg-surface-hover rounded-full mb-2" />
              <h3 className="text-text-main font-bold text-center mb-1">{chat.name}</h3>
              
              <div className="grid grid-cols-3 gap-4 w-full">
                <button 
                  onClick={(e) => { handleTogglePin(e); setShowMobileMenu(false); }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/5 border border-glass-border active:scale-95 transition-all"
                >
                  <FiAnchor className={`w-6 h-6 ${isPinned ? 'text-primary-400' : 'text-text-muted'}`} />
                  <span className="text-[10px] font-medium text-text-muted">{isPinned ? 'Unpin' : 'Pin'}</span>
                </button>
                <button 
                  onClick={(e) => { handleToggleMute(e); setShowMobileMenu(false); }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/5 border border-glass-border active:scale-95 transition-all"
                >
                  <FiBellOff className={`w-6 h-6 ${isMuted ? 'text-orange-400' : 'text-text-muted'}`} />
                  <span className="text-[10px] font-medium text-text-muted">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                {!isGlobalDirectory && (
                  <button 
                    onClick={(e) => { handleDelete(e); setShowMobileMenu(false); }}
                    className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 active:scale-95 transition-all"
                  >
                    <FiTrash2 className="w-6 h-6 text-red-400" />
                    <span className="text-[10px] font-medium text-red-400">Delete</span>
                  </button>
                )}
              </div>

              <button onClick={() => setShowMobileMenu(false)} className="w-full py-4 text-text-muted font-medium hover:text-text-main transition-colors border-t border-glass-border/30 mt-2">Close</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`p-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-all duration-300 group relative select-none touch-pan-y ${
          active
            ? 'bg-primary-500/15 shadow-lg border border-primary-500/30'
            : 'hover:bg-bg-surface-hover border border-transparent'
        }`}
        style={{ WebkitTouchCallout: 'none' }}
      >
      <UserAvatar src={chat.avatar} name={chat.name || 'Group'} online={chat.online} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <div className="flex items-center space-x-1.5 overflow-hidden">
            <h3 className="text-sm font-semibold text-text-main truncate">{chat.name}</h3>
            {isMuted && <FiBellOff className="w-3 h-3 text-text-muted/60 flex-shrink-0" />}
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {isPinned && <FiAnchor className="w-3 h-3 text-primary-400" />}
            <span className={`text-[10px] whitespace-nowrap ${chat.unread ? 'text-primary-400 font-bold' : 'text-text-muted/60'}`}>
              {formatChatTime(chat.updatedAt)}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center h-5">
          <p className={`text-xs truncate pr-4 ${chat.unread ? 'text-text-main font-semibold' : 'text-text-muted/70'}`}>
            {chat.lastMessage || 'No messages yet'}
          </p>
          
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {chat.unread > 0 && (
              <span className="bg-primary-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[17px] text-center">
                {chat.unread > 99 ? '99+' : chat.unread}
              </span>
            )}
            
            {/* Context Actions visible on hover (Desktop Only) */}
            <div className="hidden md:flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 translate-x-1 group-hover:translate-x-0">
              <button 
                onClick={handleTogglePin}
                className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-primary-400 bg-primary-500/10' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                <FiAnchor className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleToggleMute}
                className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'text-orange-400 bg-orange-500/10' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <FiBellOff className="w-3.5 h-3.5" />
              </button>
              {!isGlobalDirectory && (
                <button 
                  onClick={handleDelete}
                  className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
};

// Custom comparison function for massive performance boost on lists!
// Only re-render if the specific chat data we care about changes.
export default React.memo(ChatItemMemo, (prevProps, nextProps) => {
  return (
    prevProps.active === nextProps.active &&
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.name === nextProps.chat.name &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.unread === nextProps.chat.unread &&
    prevProps.chat.online === nextProps.chat.online &&
    prevProps.chat.updatedAt?.toMillis?.() === nextProps.chat.updatedAt?.toMillis?.() &&
    prevProps.isGlobalDirectory === nextProps.isGlobalDirectory
  );
});
