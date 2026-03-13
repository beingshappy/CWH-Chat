import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiFile, FiCornerUpLeft, FiSmile, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { db } from '../firebase/firebaseConfig';
import { doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

const MessageBubble = ({ message, isMe, grouped = false, chatId }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const { currentUser } = useAuth();
  const { setReplyTo } = useChat();

  // Use Firestore reactions if available, fallback to local (though we'll only use Firestore now)
  const currentReactions = message.reactions || {};

  const toggleReaction = async (emoji) => {
    if (!chatId || !message.id || !currentUser) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    
    const userReacted = currentReactions[emoji]?.includes(currentUser.uid);
    
    try {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: userReacted 
          ? arrayRemove(currentUser.uid) 
          : arrayUnion(currentUser.uid)
      });
      setShowReactionPicker(false);
    } catch (e) {
      console.error('Reaction update failed:', e);
    }
  };

  const handleDelete = async () => {
    if (!chatId || !message.id) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', message.id));
    } catch (e) { console.error('Delete failed:', e); }
  };

  const handleEditSave = async () => {
    if (!chatId || !message.id || !editText.trim()) return;
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        text: editText,
        edited: true,
      });
      setEditing(false);
    } catch (e) { console.error('Edit failed:', e); }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex flex-col max-w-[90%] md:max-w-[75%] lg:max-w-[550px] ${grouped ? 'mb-0.5' : 'mb-2'} ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
    >
      {/* Sender name (received, not grouped) */}
      {!isMe && !grouped && (
        <span className="text-[11px] text-slate-400 mb-1 ml-1 font-medium">
          {message.senderName || 'User'}
        </span>
      )}

      <div className="relative group">
        {/* Hover Action Bar */}
        <div className={`absolute top-1/2 -translate-y-1/2 z-10 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? '-left-24 pr-1' : '-right-24 pl-1'}`}>
          <button onClick={() => setShowReactionPicker(p => !p)} aria-label="React" className="p-1.5 rounded-full bg-slate-800/90 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 transition-colors shadow-sm">
            <FiSmile className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setReplyTo(message)} aria-label="Reply" className="p-1.5 rounded-full bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-sm">
            <FiCornerUpLeft className="w-3.5 h-3.5" />
          </button>
          {isMe && (
            <>
              <button onClick={() => { setEditing(true); setEditText(message.text || ''); }} aria-label="Edit message" className="p-1.5 rounded-full bg-slate-800/90 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors shadow-sm">
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} aria-label="Delete message" className="p-1.5 rounded-full bg-slate-800/90 text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors shadow-sm">
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Reaction Picker */}
        <AnimatePresence>
          {showReactionPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              transition={{ duration: 0.15 }}
              className={`absolute -top-10 z-20 flex items-center space-x-1 bg-slate-800/95 border border-slate-700/60 backdrop-blur-md rounded-2xl px-2 py-1.5 shadow-xl ${isMe ? 'right-0' : 'left-0'}`}
            >
              {REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => toggleReaction(emoji)} className="text-lg hover:scale-125 transition-transform leading-none">
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble */}
        <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm'} ${grouped ? (isMe ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''}`}>

          {/* Reply Context */}
          {message.replyTo && (
            <div 
              onClick={() => scrollToMessage(message.replyTo.id)}
              className={`mb-2 p-2 rounded-lg border-l-4 cursor-pointer hover:bg-white/5 transition-colors ${isMe ? 'bg-white/10 border-white/30' : 'bg-slate-900/40 border-primary-500'}`}
            >
                <p className="text-[10px] font-bold opacity-70 mb-0.5">{message.replyTo.senderName}</p>
                <p className="text-xs opacity-60 truncate">
                    {message.replyTo.mediaUrl ? '📸 Photo' : message.replyTo.text}
                </p>
            </div>
          )}

          {/* Robust Media Rendering */}
          {message.mediaUrl && (
            (() => {
              const isImage = message.mediaType?.toLowerCase() === 'image' || 
                              message.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)$/i);
              
              if (isImage) {
                return (
                  <div className="mb-2 rounded-xl overflow-hidden cursor-pointer max-w-full sm:max-w-[320px] shadow-lg border border-white/5">
                    <img 
                      src={message.mediaUrl} 
                      alt="Shared image" 
                      className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-300 rounded-xl bg-slate-900/50" 
                      onError={(e) => {
                        console.error('Image load failed:', message.mediaUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                );
              }

              // Force download for Cloudinary files by injecting fl_attachment
              const downloadUrl = message.mediaUrl?.includes('cloudinary.com') && !message.mediaUrl.includes('fl_attachment')
                ? message.mediaUrl.replace('/upload/', '/upload/fl_attachment/')
                : message.mediaUrl;

              return (
                <a href={downloadUrl} download={message.fileName || 'file'} target="_blank" rel="noreferrer" 
                  className={`flex items-center space-x-3 mb-2 p-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-slate-700/50'} hover:opacity-80 transition-opacity`}
                >
                  <div className={`p-2 rounded-lg ${isMe ? 'bg-white/10' : 'bg-slate-600'}`}><FiFile className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.fileName || 'Shared File'}</p>
                    <p className={`text-xs ${isMe ? 'text-primary-200' : 'text-slate-400'}`}>Click to download</p>
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
                <button onClick={() => setEditing(false)} className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded transition-colors">Cancel</button>
                <button onClick={handleEditSave} className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition-colors font-medium">Save</button>
              </div>
            </div>
          ) : (
            message.text && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.text}
                {message.edited && <span className="text-[10px] opacity-60 ml-1 italic">(edited)</span>}
              </p>
            )
          )}

          {/* Timestamp + Read receipt */}
          <div className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${isMe ? 'text-primary-200' : 'text-slate-500'}`}>
            <span>{message.time}</span>
            {isMe && (
              <span aria-label={message.read ? 'Read' : 'Delivered'} title={message.read ? 'Read' : 'Delivered'}>
                {message.read ? (
                  <svg className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.5l4 4L13 9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12.5l4 4 7.5-8" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
            {Object.entries(currentReactions).map(([emoji, uids]) => (
              uids?.length > 0 && (
                <button 
                  key={emoji} 
                  onClick={() => toggleReaction(emoji)} 
                  className={`text-xs border rounded-full px-2 py-0.5 flex items-center space-x-1 transition-colors ${uids.includes(currentUser.uid) ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' : 'bg-slate-800/90 border-slate-700/50 text-slate-400 hover:bg-slate-700'}`}
                  title={uids.length > 0 ? `${uids.length} reactions` : ''}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{uids.length}</span>
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
