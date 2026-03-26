import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiSend, FiArrowRight } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import UserAvatar from './UserAvatar';

const ForwardModal = ({ message, isOpen, onClose }) => {
  const { chats, forwardMessage } = useChat();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [sendingId, setSendingId] = useState(null);

  if (!isOpen) return null;

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async (chatId) => {
    setSendingId(chatId);
    try {
      await forwardMessage(message, chatId);
      onClose();
      showToast('Message Forwarded', 'Shared successfully', 'success');
    } catch (e) {
        console.error('Forward failed:', e);
    } finally {
        setSendingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 md:bg-black/60 md:backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-md bg-bg-surface border border-glass-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-glass-border flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-text-main">Forward Message</h2>
                <p className="text-xs text-text-muted mt-1">Select a chat to share this content</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 text-text-muted hover:text-text-main hover:bg-white/10 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search chats..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bg-base/50 border border-glass-border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-primary-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleForward(chat.id)}
                  disabled={sendingId !== null}
                  className="w-full p-3 rounded-2xl hover:bg-white/5 flex items-center space-x-4 transition-all group border border-transparent hover:border-glass-border active:scale-[0.98]"
                >
                  <UserAvatar src={chat.avatar} name={chat.name} size="md" />
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="text-sm font-semibold text-text-main truncate">{chat.name}</h4>
                    <p className="text-[11px] text-text-muted">{chat.isGroup ? 'Group Chat' : 'Direct Message'}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {sendingId === chat.id ? (
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiSend className="w-4 h-4 text-primary-400" />
                    )}
                  </div>
                </button>
              ))}
              
              {filteredChats.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-muted italic">No chats found matching "{search}"</p>
                </div>
              )}
            </div>

            {/* Preview (Optional) */}
            <div className="p-4 bg-bg-base/30 border-t border-glass-border flex items-center space-x-3">
              <div className="px-3 py-2 bg-primary-500/10 border border-primary-500/20 rounded-xl max-w-full">
                <p className="text-xs text-text-muted line-clamp-1 italic">
                  Preview: {message.text || (message.mediaUrl ? 'Media Attachment' : 'Empty snippet')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ForwardModal;
