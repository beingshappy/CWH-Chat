import React from 'react';
import { FiPhone, FiVideo, FiArrowUpRight, FiArrowDownLeft, FiSlash, FiTrash2 } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const CallList = () => {
  const { callHistory, startCall, deleteCall, clearCallHistory, showPopup, users } = useChat();
  const { currentUser } = useAuth();

  const formatCallTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric', hour12: true });
  };

  const handleDeleteCall = (e, callId) => {
    e.stopPropagation();
    showPopup({
      title: 'Remove Call?',
      message: 'This will remove this call from your history. This action cannot be undone.',
      type: 'confirm',
      onConfirm: () => deleteCall(callId)
    });
  };

  const handleClearAll = () => {
    showPopup({
      title: 'Clear History?',
      message: 'Are you sure you want to wipe your entire call history? This cannot be undone.',
      type: 'confirm',
      onConfirm: () => clearCallHistory()
    });
  };

  if (callHistory.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-base/40">
        <div className="w-16 h-16 bg-primary-500/5 rounded-full flex items-center justify-center mb-4 border border-primary-500/10 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
          <FiPhone className="w-8 h-8 text-primary-500 opacity-40" />
        </div>
        <p className="text-sm font-medium text-primary-500/80 tracking-wide">Private connection history</p>
        <p className="text-[11px] text-text-muted mt-1 opacity-50">Your recent history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Recent Calls</span>
        <button 
          onClick={handleClearAll}
          className="text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
        >
          Clear All
        </button>
      </div>

      <div className="px-2 space-y-1 py-2">
        {callHistory.map((call) => {
          const isCaller = call.callerId === currentUser.uid;
          const otherName = isCaller ? call.receiverName : call.callerName;
          const otherId = isCaller ? call.receiverId : call.callerId;
          const otherUser = users.find(u => u.id === otherId);
          const otherPhoto = otherUser?.avatar || otherUser?.photoURL;
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              key={call.id}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-bg-surface-hover transition-all border border-transparent hover:border-glass-border cursor-pointer relative"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center text-lg border border-glass-border overflow-hidden">
                    {otherPhoto ? (
                        <img src={otherPhoto} className="w-full h-full object-cover" alt={otherName} />
                    ) : (
                        <div className="w-full h-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-xs">
                            {otherName?.charAt(0) || '?'}
                        </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-[10px] shadow-lg ${isCaller ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {isCaller ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-text-main truncate">{otherName}</h4>
                  <div className="flex items-center space-x-2 text-[11px] text-text-muted whitespace-nowrap overflow-hidden">
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {call.type === 'video' ? <FiVideo className="w-3 h-3" /> : <FiPhone className="w-3 h-3" />}
                      <span>{call.type === 'video' ? 'Video' : 'Audio'}</span>
                    </div>
                    <span className="flex-shrink-0">•</span>
                    <span className="truncate">{formatCallTime(call.endedAt || call.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCall(otherId, otherName, call.type);
                  }}
                  className="p-2 text-text-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-full transition-all"
                  title={`Call ${otherName} back`}
                >
                  {call.type === 'video' ? <FiVideo className="w-4 h-4" /> : <FiPhone className="w-4 h-4" />}
                </button>
                <button
                   onClick={(e) => handleDeleteCall(e, call.id)}
                   className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                   title="Remove from history"
                >
                   <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CallList;
