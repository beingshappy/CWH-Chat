import React from 'react';
import { motion } from 'framer-motion';
import UserAvatar from './UserAvatar';

const formatChatTime = (timestamp) => {
  if (!timestamp) return '';
  // Support Firestore Timestamp objects and plain dates
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const ChatItem = ({ chat, active, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      role="button"
      aria-label={`Open chat with ${chat.name}`}
      aria-pressed={active}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`p-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-colors ${
        active
          ? 'bg-primary-600/20 shadow-[inset_0_0_20px_rgba(79,70,229,0.12)] border border-primary-500/30'
          : 'hover:bg-bg-surface-hover border border-transparent'
      }`}
    >
      <UserAvatar src={chat.avatar} name={chat.name || 'Group'} online={chat.online} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="text-sm font-medium text-text-main truncate pr-2">{chat.name}</h3>
          <span className={`text-[11px] whitespace-nowrap flex-shrink-0 ${chat.unread ? 'text-primary-400 font-semibold' : 'text-text-muted'}`}>
            {formatChatTime(chat.updatedAt)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-xs truncate pr-2 ${chat.unread ? 'text-text-main font-medium' : 'text-text-muted'}`}>
            {chat.lastMessage || 'No messages yet'}
          </p>
          {chat.unread > 0 && (
            <span
              aria-label={`${chat.unread} unread messages`}
              className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0"
            >
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatItem;
