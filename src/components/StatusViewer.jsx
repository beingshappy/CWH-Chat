import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiEye, FiTrash2 } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

const StatusViewer = ({ userStatus, onClose, isPane = false }) => {
  const { viewStatus, deleteStatus, showPopup, users } = useChat();
  const { currentUser } = useAuth();
  
  // Missing State Initializations
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewerList, setShowViewerList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const timerRef = useRef(null);
  const currentStory = userStatus.stories[currentIndex];
  const STORY_DURATION = currentStory?.type === 'video' ? 15000 : 5000;

  useEffect(() => {
    if (currentStory?.type === 'text') {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [currentIndex, currentStory?.type]);

  // Robust viewer mapping to handle duplicates and ensure we prioritize timestamps
  const viewerUsers = useMemo(() => {
    const viewerMap = {};
    (currentStory.viewers || []).forEach(v => {
      const uid = typeof v === 'string' ? v : v.uid;
      const viewedAt = typeof v === 'string' ? null : v.viewedAt;
      
      // Keep the one with a timestamp, or the newest one
      if (!viewerMap[uid] || (!viewerMap[uid].viewedAt && viewedAt) || (viewedAt && viewerMap[uid].viewedAt < viewedAt)) {
        viewerMap[uid] = { uid, viewedAt };
      }
    });

    return Object.values(viewerMap)
      .filter(v => v.uid !== currentUser.uid)
      .map(v => {
        const u = users.find(user => user.id === v.uid);
        return u ? { ...u, viewedAt: v.viewedAt } : null;
      })
      .filter(Boolean);
  }, [currentStory.viewers, users, currentUser.uid]);

  const totalViewers = viewerUsers.length;

  const getRelativeViewTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    // Handle Firestore Timestamp objects or raw milliseconds
    let millis = typeof timestamp === 'number' ? timestamp : (timestamp.toMillis ? timestamp.toMillis() : (timestamp.seconds ? timestamp.seconds * 1000 : null));
    
    if (!millis) return 'Recently';
    
    const diffMins = Math.floor((Date.now() - millis) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setIsPaused(true);
    showPopup({
      title: 'Delete Status?',
      message: 'Are you sure you want to remove this segment from your story?',
      type: 'confirm',
      onConfirm: async () => {
        await deleteStatus(currentStory.id);
        if (userStatus.stories.length === 1) {
          onClose();
        } else {
          handleNext();
          setIsPaused(false);
        }
      }
    });
  };

  useEffect(() => {
    if (!currentStory) return;

    // Pause timer if paused, showing viewer list, or STILL LOADING media
    if (isPaused || showViewerList || isLoading) {
      clearInterval(timerRef.current);
      return;
    }

    // Mark as viewed when starting a story (don't count my own view)
    const hasViewed = currentStory.viewers?.some(v => typeof v === 'string' ? v === currentUser.uid : v.uid === currentUser.uid);
    if (userStatus.userId !== currentUser.uid && !hasViewed) {
        viewStatus(currentStory.id);
    }

    setProgress(0);
    const start = Date.now();
    
    timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const newProgress = (elapsed / STORY_DURATION) * 100;
        
        if (newProgress >= 100) {
            handleNext();
        } else {
            setProgress(newProgress);
        }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isPaused, currentStory?.id, showViewerList, isLoading]);

  const handleNext = () => {
    if (currentIndex < userStatus.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(0); // Restart first story
    }
  };
  const handlePointerDown = () => setIsPaused(true);
  const handlePointerUp = () => setIsPaused(false);

  if (!currentStory) return null;

  return (
    <motion.div 
      initial={isPane ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={isPane ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`
        ${isPane ? 'relative w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50' : 'fixed inset-0 z-[150]'}
        bg-black/90 flex flex-col items-center justify-center overflow-hidden
      `}
    >
      {/* Tap Areas */}
      <div className="absolute inset-0 z-10 flex">
        <div className="flex-1 cursor-pointer" onClick={handlePrev} onMouseDown={handlePointerDown} onMouseUp={handlePointerUp} onTouchStart={handlePointerDown} onTouchEnd={handlePointerUp} />
        <div className="flex-1 cursor-pointer" onClick={handleNext} onMouseDown={handlePointerDown} onMouseUp={handlePointerUp} onTouchStart={handlePointerDown} onTouchEnd={handlePointerUp} />
      </div>

      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-20 flex space-x-1 sm:top-6 sm:left-10 sm:right-10">
        {userStatus.stories.map((story, index) => (
          <div key={story.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ 
                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' 
              }}
              transition={{ duration: 0 }}
            />
          </div>
        ))}
      </div>

      {/* Header Info */}
      <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between sm:top-10 sm:left-10 sm:right-10">
        <div className="flex items-center space-x-3">
            <img src={userStatus.userAvatar || 'https://i.pravatar.cc/150'} className="w-10 h-10 rounded-full border border-white/20" alt="" />
            <div>
                <h4 className="text-white font-medium text-sm">{userStatus.userName}</h4>
                <p className="text-white/60 text-[10px]">Active Status</p>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            {userStatus.userId === currentUser.uid && (
                <button 
                  onClick={handleDelete}
                  className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-full transition-all"
                  title="Delete this segment"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
            )}
            <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors">
                <FiX className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* Story Content */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none relative transition-all duration-500">
        {isLoading && currentStory.type !== 'text' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-primary-500/20 rounded-full" />
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-primary-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
              </div>
              <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-primary-500/40 uppercase">Loading Moment</p>
          </div>
        )}

        {currentStory.type === 'text' ? (
          <div className={`w-full h-full flex items-center justify-center p-12 text-center text-2xl sm:text-3xl font-bold text-white ${currentStory.backgroundColor || 'bg-bg-surface'}`}>
            {currentStory.content}
          </div>
        ) : (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            {currentStory.type === 'video' ? (
              <video 
                src={currentStory.content} 
                className="max-h-full w-auto object-contain" 
                autoPlay 
                playsInline
                onLoadedData={() => setIsLoading(false)}
                onEnded={handleNext}
              />
            ) : (
              <img 
                src={currentStory.content} 
                className="max-h-full w-auto object-contain shadow-2xl shadow-primary-500/10" 
                alt="" 
                onLoad={() => setIsLoading(false)}
              />
            )}
            {currentStory.caption && (
               <div className="absolute bottom-0 left-0 right-0 p-8 text-center text-white text-base sm:text-lg bg-gradient-to-t from-black/90 to-transparent">
                  <div className="max-w-md mx-auto">{currentStory.caption}</div>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Viewer List Button (Only if it's my status) */}
      {userStatus.userId === currentUser.uid && (
        <div className="absolute bottom-8 z-20 flex flex-col items-center">
            <button 
                onClick={(e) => { e.stopPropagation(); setShowViewerList(true); }}
                className="flex items-center space-x-2 text-white/90 text-[11px] font-bold tracking-widest bg-white/10 px-4 py-2 rounded-full backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/20 transition-all active:scale-95"
            >
                <FiEye className="w-4 h-4 text-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                <span>{totalViewers} Viewers</span>
            </button>
        </div>
      )}

      {/* Viewer Drawer */}
      <AnimatePresence>
        {showViewerList && (
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-x-0 bottom-0 z-[100] max-h-[60%] bg-bg-surface/80 md:bg-bg-surface/90 md:backdrop-blur-3xl rounded-t-[2.5rem] border-t border-glass-border flex flex-col shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />
                
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <h3 className="text-sm font-bold text-text-main flex items-center space-x-2 uppercase tracking-tight">
                        <FiEye className="w-4 h-4 text-primary-500" />
                        <span>Viewed by {totalViewers}</span>
                    </h3>
                    <button 
                        onClick={() => setShowViewerList(false)}
                        className="p-2 text-text-muted hover:text-white transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {viewerUsers.length > 0 ? (
                        viewerUsers.map(user => (
                            <div key={`${user.id}-${user.viewedAt}`} className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                <img src={user.avatar || user.photoURL} className="w-10 h-10 rounded-full border border-white/10 py-[1px] px-[1px]" alt="" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-text-main group-hover:text-primary-400 transition-colors uppercase tracking-tight">{user.name}</h4>
                                    <p className="text-[10px] text-text-muted opacity-60 flex items-center space-x-1">
                                      <span>{getRelativeViewTime(user.viewedAt)}</span>
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-text-muted opacity-40">
                             <FiEye className="w-10 h-10 mb-2" />
                             <p className="text-xs font-bold uppercase">No views yet</p>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StatusViewer;
