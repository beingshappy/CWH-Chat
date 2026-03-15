import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = ({ users = [] }) => {
  if (users.length === 0) return null;

  const typingString = (() => {
    if (users.length === 1) return `${users[0]} is typing…`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing…`;
    return `${users[0]}, ${users[1]} and ${users.length - 2} others are typing…`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center space-x-2 self-start py-1"
    >
      <div className="flex items-center space-x-1.5 bg-bg-surface border border-glass-border rounded-2xl rounded-tl-sm px-4 py-2.5">
        <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
        <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
        <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
      </div>
      <span className="text-[11px] text-text-muted font-medium">{typingString}</span>
    </motion.div>
  );
};

export default TypingIndicator;
