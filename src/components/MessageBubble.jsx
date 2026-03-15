import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiFile, FiCornerUpLeft, FiSmile, FiEdit2, FiTrash2, FiHeart, FiThumbsUp, FiStar, FiZap, FiCheckCircle, FiImage, FiShare2, FiMic, FiPlay, FiPause, FiMapPin } from 'react-icons/fi';
import { db } from '../firebase/firebaseConfig';
import { doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const REACTION_CONFIG = [
  { id: 'heart', icon: FiHeart, color: 'text-rose-400' },
  { id: 'like', icon: FiThumbsUp, color: 'text-blue-400' },
  { id: 'smile', icon: FiSmile, color: 'text-amber-400' },
  { id: 'star', icon: FiStar, color: 'text-yellow-400' },
  { id: 'zap', icon: FiZap, color: 'text-purple-400' },
  { id: 'check', icon: FiCheckCircle, color: 'text-emerald-400' },
];
 
const AudioPlayer = ({ src, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
 
  const togglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
 
  const handleTimeUpdate = () => {
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    if (total) {
      setProgress((current / total) * 100);
    }
  };
 
  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };
 
  const handleSeek = (e) => {
    e.stopPropagation();
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setProgress(newProgress);
  };
 
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
 
  return (
    <div className={`flex flex-col w-full space-y-1.5 p-1 ${isMe ? 'text-white' : 'text-text-main'}`}>
      <div className="flex items-center space-x-3">
        <button 
          onClick={togglePlay}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-500'}`}
        >
          {isPlaying ? <FiPause className="w-5 h-5" /> : <FiPlay className="w-5 h-5 ml-0.5" />}
        </button>
        
        <div className="flex-1 flex flex-col space-y-1">
          <input 
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className={`w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-primary-400 luxury-slider`}
            style={{ 
              background: `linear-gradient(to right, ${isMe ? '#fff' : '#3b82f6'} ${progress}%, rgba(255,255,255,0.1) ${progress}%)` 
            }}
          />
          <div className="flex justify-between items-center px-0.5">
             <span className="text-[9px] font-medium opacity-60 tracking-wider font-mono">
               {formatTime(audioRef.current?.currentTime || 0)}
             </span>
             <span className="text-[9px] font-medium opacity-60 tracking-wider font-mono">
               {formatTime(duration)}
             </span>
          </div>
        </div>
      </div>
      <audio 
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

const MessageBubble = ({ message, isMe, grouped = false, chatId, onForward }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const { currentUser } = useAuth();
  const { setReplyTo, showPopup, toggleStarMessage } = useChat();
  const longPressTimer = useRef(null);

  const isStarred = message.starredBy?.includes(currentUser?.uid);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }, []);

  const currentReactions = message.reactions || {};

  const toggleReaction = async (reactionId) => {
    if (!chatId || !message.id || !currentUser) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const userReacted = currentReactions[reactionId]?.includes(currentUser.uid);
    
    try {
      await updateDoc(msgRef, {
        [`reactions.${reactionId}`]: userReacted 
          ? arrayRemove(currentUser.uid) 
          : arrayUnion(currentUser.uid)
      });
      setShowReactionPicker(false);
      setShowMobileMenu(false);
    } catch (e) {
      console.error('Reaction update failed:', e);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(false); // Close desktop picker if open
      setShowMobileMenu(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleDelete = () => {
    if (!chatId || !message.id) return;
    
    if (message.isDeleted) {
      // Permanent Delete
      showPopup({
        title: 'Delete Forever?',
        message: 'This will remove the record completely from the chat history for everyone. This action cannot be undone.',
        type: 'confirm',
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'chats', chatId, 'messages', message.id));
            setShowMobileMenu(false);
          } catch (e) {
            console.error('Permanent delete failed:', e);
          }
        }
      });
      return;
    }

    // Soft Delete
    showPopup({
      title: 'Delete Message?',
      message: 'This message will be removed for everyone in this chat.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
            isDeleted: true,
            text: '',
            mediaUrl: null,
            mediaType: null,
            fileName: null,
            reactions: {}
          });
          setShowMobileMenu(false);
        } catch (e) {
          console.error('Delete failed:', e);
        }
      }
    });
  };

  const handleEditSave = async () => {
    if (!chatId || !message.id || !editText.trim()) return;
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        text: editText,
        edited: true,
      });
      setEditing(false);
      setShowMobileMenu(false);
    } catch (e) { console.error('Edit failed:', e); }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const ActionButtons = ({ className, mobile = false }) => (
    <div className={className}>
      {!message.isDeleted && (
        <>
          <button 
            onClick={() => { setShowReactionPicker(p => !p); if (mobile) setShowMobileMenu(false); }} 
            title="React" 
            className={`${mobile ? 'p-2.5 rounded-full bg-bg-surface/90 shadow-sm' : 'p-1.5 rounded-lg hover:bg-white/10'} text-text-muted hover:text-yellow-400 transition-all active:scale-90`}
          >
            <FiSmile className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          </button>
          <button 
            onClick={() => { setReplyTo(message); setShowMobileMenu(false); }} 
            title="Reply" 
            className={`${mobile ? 'p-2.5 rounded-full bg-bg-surface/90 shadow-sm' : 'p-1.5 rounded-lg hover:bg-white/10'} text-text-muted hover:text-text-main transition-all active:scale-90`}
          >
            <FiCornerUpLeft className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          </button>
          <button 
            onClick={() => { toggleStarMessage(chatId, message.id, isStarred); setShowMobileMenu(false); }} 
            title={isStarred ? "Unstar" : "Star"}
            className={`${mobile ? 'p-2.5 rounded-full bg-bg-surface/90 shadow-sm' : 'p-1.5 rounded-lg hover:bg-white/10'} transition-all active:scale-90 ${isStarred ? 'text-yellow-400' : 'text-text-muted hover:text-yellow-400'}`}
          >
            <FiStar className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          </button>
          <button 
            onClick={() => { onForward?.(message); setShowMobileMenu(false); }} 
            title="Forward" 
            className={`${mobile ? 'p-2.5 rounded-full bg-bg-surface/90 shadow-sm' : 'p-1.5 rounded-lg hover:bg-white/10'} text-text-muted hover:text-primary-400 transition-all active:scale-90`}
          >
            <FiShare2 className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          </button>
        </>
      )}
      {isMe && (
        <>
          {!message.isDeleted && (
            <button 
              onClick={() => { setEditing(true); setEditText(message.text || ''); setShowMobileMenu(false); }} 
              title="Edit" 
              className={`${mobile ? 'p-2.5 rounded-full bg-bg-surface/90 shadow-sm' : 'p-1.5 rounded-lg hover:bg-white/10'} text-text-muted hover:text-blue-400 transition-all active:scale-90`}
            >
              <FiEdit2 className={mobile ? "w-5 h-5" : "w-4 h-4"} />
            </button>
          )}
          <button 
            onClick={handleDelete} 
            title={message.isDeleted ? "Delete Forever" : "Delete"} 
            className={`${mobile ? 'p-2.5 rounded-full bg-bg-surface/90 shadow-sm' : 'p-1.5 rounded-lg hover:bg-white/10'} text-text-muted hover:text-red-400 transition-all active:scale-90`}
          >
            <FiTrash2 className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, scale: 0.98, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={`flex flex-col max-w-[90%] md:max-w-[75%] lg:max-w-[550px] ${grouped ? 'mb-0.5' : 'mb-2'} ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
    >
      {/* Sender name (received, not grouped) */}
      {!isMe && !grouped && (
        <span className="text-[11px] text-text-muted mb-1 ml-1 font-medium">
          {message.senderName || 'User'}
        </span>
      )}

      <div className="relative group">
        {/* Desktop Hover Glass Action Bar */}
        <ActionButtons className={`
          hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 
          items-center space-x-0.5 opacity-0 group-hover:opacity-100 
          transition-all duration-300 transform scale-95 group-hover:scale-100
          bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-2xl shadow-2xl
          ${isMe ? '-left-2 pr-2 translate-x-[-100%]' : '-right-2 pl-2 translate-x-[100%]'}
        `} />

        {/* Mobile Action Sheet */}
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
                
                {/* Reactions Section */}
                {!message.isDeleted && (
                  <div className="flex items-center justify-between w-full bg-white/5 border border-glass-border rounded-2xl p-3 mb-2">
                    {REACTION_CONFIG.map(reaction => {
                      const Icon = reaction.icon;
                      const hasMe = currentUser && currentReactions[reaction.id]?.includes(currentUser.uid);
                      return (
                        <button 
                          key={reaction.id} 
                          onClick={() => { toggleReaction(reaction.id); if (window.navigator.vibrate) window.navigator.vibrate(40); setShowMobileMenu(false); }} 
                          className={`flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-125 ${hasMe ? 'bg-primary-500/20 shadow-inner' : 'hover:bg-white/5'}`}
                        >
                          <Icon className={`w-6 h-6 ${hasMe ? reaction.color : 'text-text-muted/80'}`} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Actions Grid */}
                <div className={`grid ${message.isDeleted ? 'grid-cols-1' : (isMe ? 'grid-cols-3' : 'grid-cols-3')} gap-3 w-full`}>
                  {!message.isDeleted && (
                    <>
                      <button 
                        onClick={() => { setReplyTo(message); setShowMobileMenu(false); }}
                        className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/5 border border-glass-border active:scale-95 transition-all text-text-muted"
                      >
                        <FiCornerUpLeft className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Reply</span>
                      </button>
                      <button 
                        onClick={() => { toggleStarMessage(chatId, message.id, isStarred); if (window.navigator.vibrate) window.navigator.vibrate(40); setShowMobileMenu(false); }}
                        className={`flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/5 border border-glass-border active:scale-95 transition-all ${isStarred ? 'text-yellow-400' : 'text-text-muted'}`}
                      >
                        <FiStar className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{isStarred ? 'Unstar' : 'Star'}</span>
                      </button>
                      <button 
                        onClick={() => { onForward?.(message); setShowMobileMenu(false); }}
                        className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/5 border border-glass-border active:scale-95 transition-all text-text-muted"
                      >
                        <FiShare2 className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Forward</span>
                      </button>
                    </>
                  )}
                  {isMe && (
                    <>
                      {!message.isDeleted && (
                        <button 
                          onClick={() => { setEditing(true); setEditText(message.text || ''); setShowMobileMenu(false); }}
                          className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white/5 border border-glass-border active:scale-95 transition-all text-text-muted"
                        >
                          <FiEdit2 className="w-6 h-6" />
                          <span className="text-[10px] font-medium">Edit</span>
                        </button>
                      )}
                      <button 
                        onClick={(e) => { handleDelete(e); setShowMobileMenu(false); }}
                        className={`flex flex-col items-center space-y-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 active:scale-95 transition-all text-red-400 ${message.isDeleted ? 'w-full' : ''}`}
                      >
                        <FiTrash2 className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{message.isDeleted ? 'Delete Forever' : 'Delete'}</span>
                      </button>
                    </>
                  )}
                </div>

                <button onClick={() => setShowMobileMenu(false)} className="w-full py-4 text-text-muted font-medium hover:text-text-main transition-colors border-t border-glass-border/30 mt-2">Close</button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Reaction Picker (Desktop) */}
        <AnimatePresence>
          {showReactionPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className={`absolute -top-10 z-20 hidden md:flex items-center space-x-1 bg-bg-surface/95 border border-glass-border backdrop-blur-md rounded-2xl px-2 py-1.5 shadow-xl ${isMe ? 'right-0' : 'left-0'}`}
            >
              <div className="flex space-x-1 p-1">
                {REACTION_CONFIG.map(reaction => {
                  const Icon = reaction.icon;
                  const hasMe = currentUser && currentReactions[reaction.id]?.includes(currentUser.uid);
                  return (
                    <button 
                        key={reaction.id} 
                        onClick={() => toggleReaction(reaction.id)} 
                        className={`p-1.5 rounded-lg transition-all hover:bg-bg-surface-hover ${hasMe ? 'bg-primary-500/10' : ''}`}
                    >
                        <Icon className={`w-3.5 h-3.5 ${hasMe ? reaction.color : 'text-text-muted'}`} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className={`px-4 py-2.5 rounded-2xl shadow-sm relative select-none touch-pan-y ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-bg-surface text-text-main border border-glass-border rounded-tl-sm shadow-inner'} ${grouped ? (isMe ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''} ${message.isDeleted ? 'opacity-50' : ''}`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          {/* Forwarded Header */}
          {message.isForwarded && (
            <div className={`flex items-center space-x-1 mb-1 opacity-60 italic text-[10px] ${isMe ? 'text-primary-100 justify-end' : 'text-text-muted justify-start'}`}>
              <FiShare2 className="w-2.5 h-2.5" />
              <span>Forwarded</span>
            </div>
          )}
          {/* Reply Context */}
          {message.replyTo && (
            <div 
              onClick={() => scrollToMessage(message.replyTo.id)}
              className={`mb-2 p-2 rounded-lg border-l-4 cursor-pointer hover:bg-white/5 transition-colors ${isMe ? 'bg-white/10 border-white/30' : 'bg-bg-base/40 border-primary-500'}`}
            >
                <p className="text-[10px] font-bold opacity-70 mb-0.5">{message.replyTo.senderName}</p>
                <div className="flex items-center space-x-1.5 text-xs opacity-60">
                    {message.replyTo.mediaUrl ? (
                        <>
                            <FiImage className="w-3 h-3" />
                            <span>Photo</span>
                        </>
                    ) : (
                        <span className="truncate">{message.replyTo.text}</span>
                    )}
                </div>
            </div>
          )}

          {/* Robust Media Rendering */}
          {message.mediaUrl && (
            (() => {
              const url = message.mediaUrl.toLowerCase();
              const isImage = message.mediaType?.includes('image') || url.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)$/i);
              const isAudio = message.mediaType?.includes('audio') || url.match(/\.(mp3|wav|m4a|ogg|webm)$/i);
              
              if (isImage) {
                return (
                  <div className="mb-2 rounded-xl overflow-hidden cursor-pointer max-w-full sm:max-w-[320px] shadow-lg border border-white/5">
                    <img 
                      src={message.mediaUrl} 
                      alt="Shared" 
                      className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-300 rounded-xl bg-bg-base/50" 
                    />
                  </div>
                );
              }

              if (isAudio) {
                return (
                  <div className={`mb-2 p-2.5 rounded-2xl flex items-center ${isMe ? 'bg-white/10' : 'bg-bg-base/40 border border-glass-border'} w-[280px] sm:w-[340px] max-w-full shadow-sm`}>
                    <AudioPlayer src={message.mediaUrl} isMe={isMe} />
                  </div>
                );
              }

              // Force download for Cloudinary files
              const downloadUrl = message.mediaUrl?.includes('cloudinary.com') && !message.mediaUrl.includes('fl_attachment')
                ? message.mediaUrl.replace('/upload/', '/upload/fl_attachment/')
                : message.mediaUrl;

              return (
                <a href={downloadUrl} download={message.fileName || 'file'} target="_blank" rel="noreferrer" 
                  className={`flex items-center space-x-3 mb-2 p-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-bg-surface-hover/50'} hover:opacity-80 transition-opacity`}
                >
                  <div className={`p-2 rounded-lg ${isMe ? 'bg-white/10' : 'bg-bg-surface-hover'}`}><FiFile className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.fileName || 'Shared File'}</p>
                    <p className={`text-xs ${isMe ? 'text-primary-200' : 'text-text-muted'}`}>Click to download</p>
                  </div>
                  <FiDownload className="w-4 h-4 flex-shrink-0" />
                </a>
              );
            })()
          )}

          {/* Edit mode */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } if (e.key === 'Escape') setEditing(false); }}
                className="w-full bg-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setEditing(false)} className={`text-xs px-2 py-1 rounded transition-colors ${isMe ? 'text-primary-100 hover:text-white' : 'text-text-muted hover:text-text-main'}`}>Cancel</button>
                <button onClick={handleEditSave} className={`text-[11px] px-3 py-1 rounded-lg transition-all font-bold shadow-lg ${isMe ? 'bg-white text-primary-600 hover:bg-primary-50' : 'bg-primary-500 text-white hover:bg-primary-600'} active:scale-95`}>Save</button>
              </div>
            </div>
          ) : message.isDeleted ? (
            <div className="flex items-center space-x-2 italic opacity-60 py-1">
              <FiTrash2 className="w-3.5 h-3.5" />
              <p className="text-sm">This message was deleted</p>
            </div>
          ) : (
            message.text && (
              message.text.startsWith('https://www.google.com/maps?q=') ? (
                <a 
                  href={message.text} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block relative rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 w-[160px] sm:w-[200px] flex-shrink-0 border border-white/10 group bg-[#0f172a]"
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300 z-10" />
                  <div className="h-24 sm:h-28 w-full relative grid" style={{
                    backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.1) 1px, transparent 0)',
                    backgroundSize: '12px 12px'
                  }}>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="relative">
                        <FiMapPin className="w-7 h-7 text-red-500 drop-shadow-lg relative z-10 transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500/30 animate-ping" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-20">
                    <p className="text-[10px] font-bold text-white text-center tracking-tight">Location</p>
                  </div>
                </a>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.text}
                  {message.edited && <span className="text-[10px] opacity-60 ml-1 italic">(edited)</span>}
                </p>
              )
            )
          )}

          {/* Timestamp + Read receipt + Star */}
          <div className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${isMe ? 'text-primary-100' : 'text-text-muted'} whitespace-nowrap`}>
            {isStarred && <FiStar className="w-2.5 h-2.5 text-yellow-400 mr-1" />}
            <span className="flex-shrink-0">{message.time}</span>
            {isMe && (
              <span aria-label={message.read ? 'Read' : 'Sent'} title={message.read ? 'Read' : 'Sent'}>
                {message.read ? (
                  <svg className="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.5l4 4L13 9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12.5l4 4 7.5-8" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction badges (Firestore persisted) */}
        {Object.keys(currentReactions).some(k => currentReactions[k]?.length > 0) && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(currentReactions).map(([reactionId, uids]) => {
              const reaction = REACTION_CONFIG.find(r => r.id === reactionId);
              if (!reaction || !uids?.length) return null;
              const Icon = reaction.icon;
              const hasMe = currentUser && uids.includes(currentUser.uid);

              return (
                <button 
                  key={reactionId} 
                  onClick={() => toggleReaction(reactionId)} 
                  className={`text-[10px] border rounded-full px-1.5 py-0.5 flex items-center space-x-1 transition-colors ${hasMe ? 'bg-primary-500/20 border-primary-500/40 text-primary-500' : 'bg-bg-surface border-glass-border text-text-muted hover:bg-bg-surface-hover'}`}
                  title={`${uids.length} reactions`}
                >
                  <Icon className={`w-2.5 h-2.5 ${hasMe ? reaction.color : ''}`} />
                  <span className="font-medium">{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Custom comparison to avoid re-renders on every parent update
const MessageBubbleMemo = memo(MessageBubble, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.read === nextProps.message.read &&
    prevProps.message.reactions === nextProps.message.reactions &&
    prevProps.message.starredBy === nextProps.message.starredBy &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.grouped === nextProps.grouped &&
    prevProps.chatId === nextProps.chatId
  );
});

export default MessageBubbleMemo;
