import React from 'react';
import { FiPhone, FiVideo, FiArrowUpRight, FiArrowDownLeft, FiSlash } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const CallList = () => {
  const { callHistory, startCall } = useChat();
  const { currentUser } = useAuth();

  const formatCallTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  if (callHistory.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center mb-4 border border-white/5">
          <FiPhone className="w-8 h-8 text-slate-500 opacity-50" />
        </div>
        <p className="text-sm text-text-muted">No call history yet</p>
        <p className="text-xs text-text-muted/60 mt-1">Your recent audio and video calls will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2 scrollbar-custom">
      {callHistory.map((call) => {
        const isCaller = call.callerId === currentUser.uid;
        const otherName = isCaller ? call.receiverName : call.callerName;
        const otherId = isCaller ? call.receiverId : call.callerId;
        
        return (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            key={call.id}
            className="group flex items-center justify-between p-3 rounded-xl hover:bg-bg-surface-hover transition-all border border-transparent hover:border-glass-border cursor-pointer"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg border border-white/5">
                  {call.callerPhoto && !isCaller ? (
                      <img src={call.callerPhoto} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                      '👤'
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-[10px] shadow-lg ${isCaller ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                  {isCaller ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                </div>
              </div>
              
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-text-main truncate">{otherName}</h4>
                <div className="flex items-center space-x-2 text-[11px] text-text-muted">
                  {call.type === 'video' ? <FiVideo className="w-3 h-3" /> : <FiPhone className="w-3 h-3" />}
                  <span>{call.type === 'video' ? 'Video' : 'Audio'}</span>
                  <span>•</span>
                  <span>{formatCallTime(call.endedAt || call.createdAt)}</span>
                </div>
              </div>
            </div>

            <button
               onClick={(e) => {
                 e.stopPropagation();
                 startCall(otherId, otherName, call.type);
               }}
               className="p-2.5 text-text-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
               title={`Call ${otherName} back`}
            >
               {call.type === 'video' ? <FiVideo className="w-5 h-5" /> : <FiPhone className="w-5 h-5" />}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};

export default CallList;
