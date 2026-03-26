import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiPaperclip, FiSmile, FiSend, FiImage, FiX, FiMic, FiSquare, FiMapPin, FiFileText } from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';

const MessageInput = ({ onSend, onTyping, isBlocked }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const { replyTo, setReplyTo } = useChat();
  const [isLocating, setIsLocating] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef(null);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

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

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // webm is widely supported for recording
        const audioFile = new File([audioBlob], `voice_memo_${Date.now()}.webm`, { type: 'audio/webm' });
        onSend('', audioFile, replyTo);
        setReplyTo(null);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        onSend(mapsUrl, null, replyTo);
        setReplyTo(null);
      },
      (error) => {
        setIsLocating(false);
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please ensure location permissions are granted.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative p-2 sm:p-4 bg-sidebar-premium border-t border-glass-border z-20">
      
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
               <p className="text-[10px] font-bold text-primary-400 tracking-wider mb-0.5">Replying to {replyTo.senderName}</p>
               <div className="flex items-center space-x-1.5 text-xs text-text-muted">
                   {replyTo.mediaUrl ? (
                       <>
                           <FiImage className="w-3.5 h-3.5" />
                           <span>Photo</span>
                       </>
                   ) : (
                       <span className="truncate">{replyTo.text}</span>
                   )}
               </div>
             </div>
             <button onClick={() => setReplyTo(null)} className="p-1 text-text-muted hover:text-text-main transition-colors">
                <FiX className="w-4 h-4" />
             </button>
           </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Area */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {selectedFile && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="fixed bottom-[72px] left-4 right-4 md:left-[calc(320px+1rem)] md:right-4 lg:left-[calc(384px+1rem)] md:max-w-sm p-3 bg-[#010c24] border border-primary-500/20 rounded-xl flex items-center space-x-3 z-[9000] shadow-2xl"
            >
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-glass-border/30" />
            ) : (
              <div className="w-12 h-12 bg-bg-surface-hover rounded-lg flex items-center justify-center text-text-muted">
                <FiPaperclip className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-main truncate">{selectedFile.name}</p>
              <p className="text-xs text-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="p-1.5 bg-bg-base/80 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-full transition-colors relative -top-4 -right-2">
              <FiX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {ReactDOM.createPortal(
        <AnimatePresence>
          {showEmoji && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-[72px] left-0 right-0 md:left-80 lg:left-96 z-[9000] shadow-2xl shadow-black/50 px-2 sm:px-0"
            >
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-700/50 relative w-full sm:w-[320px]">
              <button 
                onClick={() => setShowEmoji(false)}
                className="absolute top-2 right-2 z-[60] p-1.5 bg-black/40 hover:bg-black/60 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all active:scale-90"
              >
                <FiX className="w-4 h-4" />
              </button>
              <EmojiPicker 
                onEmojiClick={onEmojiClick} 
                theme="dark"
                searchDisabled
                skinTonesDisabled
                height={Math.min(window.innerHeight * 0.4, 350)}
                width="100%"
                style={{ 
                  '--epr-scrollbar-color': 'rgba(255, 255, 255, 0.1)',
                  '--epr-scrollbar-hover-color': 'rgba(255, 255, 255, 0.2)',
                  '--epr-bg-color': 'transparent',
                  '--epr-category-label-bg-color': 'rgba(255, 255, 255, 0.05)',
                }}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      <input type="file" accept="image/*" ref={imageInputRef} onChange={handleFileSelect} className="hidden" />

      <form onSubmit={handleSubmit} className="flex items-end space-x-1 sm:space-x-2">
        {!isRecording ? (
          <>
            <div className="flex space-x-0 sm:space-x-1 mb-1 sm:mb-1.5 items-center">
              <motion.button 
                type="button" 
                disabled={isBlocked}
                onClick={() => setShowEmoji(!showEmoji)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={`p-1.5 sm:p-2 rounded-full transition-colors ${isBlocked ? 'opacity-20 cursor-not-allowed' : (showEmoji ? 'text-primary-400 bg-primary-500/10' : 'text-text-muted hover:text-text-main hover:bg-white/10')}`}
              >
                <FiSmile className="w-5 h-5" />
              </motion.button>
              
              <div className="relative" ref={attachMenuRef}>
                <motion.button
                  type="button" 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isBlocked}
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`p-1.5 sm:p-2 transition-colors rounded-full ${isBlocked ? 'opacity-20 cursor-not-allowed' : 'text-text-muted hover:text-text-main hover:bg-white/10'}`}
                  title="Attach"
                >
                  <FiPaperclip className={`w-5 h-5 transition-transform duration-300 ${showAttachMenu ? 'rotate-45' : ''}`} />
                </motion.button>

                {ReactDOM.createPortal(
                  <AnimatePresence>
                    {showAttachMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed bottom-[72px] left-16 sm:left-20 md:left-[calc(320px+4rem)] lg:left-[calc(384px+4rem)] mb-2 w-48 bg-bg-surface/95 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden py-1 z-[9999] flex flex-col"
                      >
                        <button
                          type="button"
                          onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-text-main hover:bg-white/10 transition-colors w-full text-left"
                        >
                          <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
                            <FiFileText className="w-4 h-4" />
                          </div>
                          <span className="font-medium">Document</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { shareLocation(); setShowAttachMenu(false); }}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-text-main hover:bg-white/10 transition-colors w-full text-left border-t border-glass-border/30"
                        >
                          <div className="p-2 rounded-full bg-red-500/20 text-red-400">
                            {isLocating ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FiMapPin className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-medium">Location</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </div>

              <motion.button 
                type="button" 
                whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                disabled={isBlocked}
                onClick={() => imageInputRef.current?.click()}
                className={`p-1.5 sm:p-2 transition-colors rounded-full ${isBlocked ? 'opacity-20 cursor-not-allowed' : 'text-text-muted hover:text-text-main'}`}
                title="Send Photo"
              >
                <FiImage className="w-5 h-5" />
              </motion.button>
            </div>

            <div className={`flex-1 min-w-0 bg-bg-surface/50 border border-glass-border rounded-2xl flex items-center shadow-inner transition-all ${isBlocked ? 'opacity-50' : 'focus-within:ring-1 focus-within:ring-primary-500 focus-within:border-primary-500/50'}`}>
              <textarea
                ref={inputRef}
                value={message}
                disabled={isBlocked}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isBlocked) handleSubmit(e);
                  }
                }}
                placeholder={isBlocked ? "You cannot message a blocked contact" : "Type a message..."}
                className="w-full bg-transparent text-white px-3 sm:px-4 py-3 max-h-32 min-h-[44px] resize-none focus:outline-none scrollbar-custom text-sm"
                rows={1}
              />
            </div>

            <AnimatePresence mode="wait">
              {!message.trim() && !selectedFile ? (
                <motion.button
                  key="mic-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  disabled={isBlocked}
                  onClick={startRecording}
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-3 mb-0.5 rounded-full bg-bg-surface border border-glass-border text-primary-400 transition-colors shadow-lg flex-shrink-0 ${isBlocked ? 'opacity-20 cursor-not-allowed' : 'hover:text-primary-300'}`}
                  title="Voice Message"
                >
                  <FiMic className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  key="send-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  whileHover={{ scale: 1.1, backgroundColor: '#3b82f6' }}
                  whileTap={{ scale: 0.9 }}
                  className="p-3 mb-0.5 rounded-full bg-primary-600 text-white hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20 flex-shrink-0"
                >
                  <FiSend className="w-5 h-5 ml-0.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between bg-primary-500/10 border border-primary-500/30 rounded-2xl px-4 py-2 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-sm font-bold text-primary-400 tracking-wider">Recording {formatDuration(recordingDuration)}</span>
            </div>
            <button 
              type="button" 
              onClick={stopRecording}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center space-x-1"
            >
              <FiSend className="w-4 h-4" />
              <span className="text-[10px] font-bold px-1 uppercase">Send</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
