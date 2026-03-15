import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiImage, FiType, FiSend, FiLoader } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';

const StatusCreator = ({ onClose }) => {
  const [type, setType] = useState('text'); // 'text' or 'media'
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('bg-gradient-to-br from-indigo-600 to-purple-700');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const { postStatus, showPopup } = useChat();

  const colors = [
    'bg-gradient-to-br from-indigo-600 to-purple-700',
    'bg-gradient-to-br from-rose-500 to-orange-400',
    'bg-gradient-to-br from-emerald-500 to-teal-400',
    'bg-gradient-to-br from-blue-600 to-cyan-500',
    'bg-gradient-to-br from-amber-500 to-pink-500',
    'bg-bg-surface',
  ];

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setType('media');
    }
  };

  const handlePost = async () => {
    setLoading(true);
    try {
      if (type === 'text') {
        await postStatus({
          type: 'text',
          content: textContent,
          backgroundColor: bgColor,
        });
      } else {
        const statusData = {
          type: mediaFile.type.startsWith('video/') ? 'video' : 'image',
          caption: caption,
        };
        // The mediaService is handled within ChatContext's postStatus in our plan? 
        // Actually, sendMessage handles it. Let's adapt postStatus to handle file or take URL.
        // I'll import uploadMedia here for clarity.
        const { uploadMedia } = await import('../utils/mediaService');
        const mediaUrl = await uploadMedia(mediaFile);
        
        await postStatus({
          ...statusData,
          content: mediaUrl,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to post status:', error);
      showPopup({
        title: 'Upload Failed',
        message: 'Failed to post your status update. Please check your connection and try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[100] bg-bg-base flex flex-col items-center justify-center p-4 sm:p-6"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors">
          <FiX className="w-6 h-6" />
        </button>
        <div className="flex space-x-2">
            <button 
                onClick={() => setType('text')}
                className={`p-3 rounded-full transition-all ${type === 'text' ? 'bg-primary-500 text-white scale-110' : 'bg-white/10 text-white/70'}`}
            >
                <FiType className="w-5 h-5" />
            </button>
            <label className={`p-3 rounded-full transition-all cursor-pointer ${type === 'media' ? 'bg-primary-500 text-white scale-110' : 'bg-white/10 text-white/70'}`}>
                <FiImage className="w-5 h-5" />
                <input type="file" hidden accept="image/*,video/*" onChange={handleMediaSelect} />
            </label>
        </div>
      </div>

      {/* Canvas */}
      <div className={`w-full max-w-lg aspect-[9/16] rounded-3xl relative overflow-hidden shadow-2xl flex flex-col items-center justify-center ${type === 'text' ? bgColor : 'bg-black'}`}>
        {type === 'text' ? (
          <textarea
            autoFocus
            className="w-full h-full bg-transparent text-white text-3xl font-bold p-8 text-center flex items-center justify-center resize-none focus:outline-none placeholder:text-white/30"
            placeholder="Type your status..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          />
        ) : (
          <div className="w-full h-full relative group">
            {mediaFile?.type.startsWith('video/') ? (
              <video src={mediaPreview} className="w-full h-full object-contain" autoPlay muted loop />
            ) : (
              <img src={mediaPreview} className="w-full h-full object-contain" alt="Preview" />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <input 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                />
            </div>
          </div>
        )}

        {/* Floating color picker if text */}
        {type === 'text' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                {colors.map(color => (
                    <button 
                        key={color}
                        onClick={() => setBgColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${color} ${bgColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    />
                ))}
            </div>
        )}
      </div>

      {/* FAB Send */}
      <motion.button
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         disabled={loading || (type === 'text' && !textContent.trim()) || (type === 'media' && !mediaFile)}
         onClick={handlePost}
         className="mt-8 bg-primary-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-primary-500/30 disabled:opacity-50 disabled:scale-100"
      >
        {loading ? <FiLoader className="w-6 h-6 animate-spin" /> : <FiSend className="w-6 h-6 ml-1" />}
      </motion.button>
    </motion.div>
  );
};

export default StatusCreator;
