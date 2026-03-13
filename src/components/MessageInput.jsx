import React, { useState, useRef } from 'react';
import { FiPaperclip, FiSmile, FiSend, FiImage, FiX } from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';

const MessageInput = ({ onSend, onTyping }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const { replyTo, setReplyTo } = useChat();
  
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    // Call onTyping(true) then debounced onTyping(false)
    if (onTyping) {
        onTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 3000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() || selectedFile) {
      onSend(message, selectedFile, replyTo);
      setMessage('');
      setShowEmoji(false);
      clearFile();
      setReplyTo(null);
      if (onTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTyping(false);
      }
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  return (
    <div className="relative p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xl border-t border-white/5 z-20">
      
      {/* Reply Preview Area */}
      <AnimatePresence>
        {replyTo && (
           <motion.div 
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             className="mx-4 mb-2 p-3 bg-white/5 rounded-xl border-l-4 border-primary-500 relative flex items-center justify-between"
           >
             <div className="flex-1 min-w-0 pr-8">
               <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-0.5">Replying to {replyTo.senderName}</p>
               <p className="text-xs text-slate-400 truncate">
                   {replyTo.mediaUrl ? '📸 Photo' : replyTo.text}
               </p>
             </div>
             <button onClick={() => setReplyTo(null)} className="p-1 text-slate-500 hover:text-white transition-colors">
                <FiX className="w-4 h-4" />
             </button>
           </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Area */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="absolute bottom-full left-4 right-4 mb-4 p-3 glass-card rounded-xl flex items-center space-x-3 max-w-full sm:max-w-sm z-50"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
            ) : (
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                <FiPaperclip className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="p-1.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-colors relative -top-4 -right-2">
              <FiX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmoji && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 left-4 z-50 shadow-2xl shadow-black/50"
          >
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-700/50">
              <EmojiPicker 
                onEmojiClick={onEmojiClick} 
                theme="dark"
                searchDisabled
                skinTonesDisabled
                height={350}
                width={300}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      <input type="file" accept="image/*" ref={imageInputRef} onChange={handleFileSelect} className="hidden" />

      <form onSubmit={handleSubmit} className="flex items-end space-x-1 sm:space-x-2">
        <div className="flex space-x-0 sm:space-x-1 mb-1 sm:mb-1.5">
          <button 
            type="button" 
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-1.5 sm:p-2 rounded-full transition-colors ${showEmoji ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            <FiSmile className="w-5 h-5" />
          </button>
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <FiPaperclip className="w-5 h-5" />
          </button>
          
          <button 
            type="button" 
            onClick={() => imageInputRef.current?.click()}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <FiImage className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center shadow-inner transition-all focus-within:ring-1 focus-within:ring-primary-500 focus-within:border-primary-500/50">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type a message..."
            className="w-full bg-transparent text-white px-3 sm:px-4 py-3 max-h-32 min-h-[44px] resize-none focus:outline-none scrollbar-custom text-sm"
            rows={1}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() && !selectedFile}
          className="p-2.5 sm:p-3.5 mb-0.5 rounded-full bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20 active:scale-95 flex-shrink-0"
        >
          <FiSend className="w-5 h-5 ml-0.5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
