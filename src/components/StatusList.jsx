import React from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { FiPlus } from 'react-icons/fi';

const StatusList = ({ onOpenCreator, onOpenViewer }) => {
  const { statuses } = useChat();
  const { currentUser } = useAuth();

  const myStatus = statuses.find(s => s.userId === currentUser.uid);
  const otherStatuses = statuses.filter(s => s.userId !== currentUser.uid);

  return (
    <div className="flex flex-col space-y-1 p-2">
      {/* My Status */}
      <div className="flex items-center justify-between p-1">
        <div 
          className="flex-1 flex items-center space-x-3 p-3 rounded-xl hover:bg-bg-surface-hover cursor-pointer transition-colors group"
          onClick={() => myStatus ? onOpenViewer(myStatus) : onOpenCreator()}
        >
          <div className="relative">
            <div className={`p-[2px] rounded-full ${myStatus ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-base' : ''}`}>
              <img 
                src={currentUser?.photoURL || 'https://i.pravatar.cc/150'} 
                className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/10"
                alt="My Status"
              />
            </div>
            {!myStatus && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center border-2 border-bg-base">
                <FiPlus className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-main">My Status</h3>
            <p className="text-xs text-text-muted">
              {myStatus ? 'Tap to view your updates' : 'Tap to add status update'}
            </p>
          </div>
        </div>
        
        {myStatus && (
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenCreator(); }}
            className="p-3 text-primary-400 hover:text-primary-300 hover:bg-bg-surface-hover rounded-full transition-colors"
            title="Add new status"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        )}
      </div>

      {otherStatuses.length > 0 && (
        <>
          <div className="px-3 py-4 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Recent Updates
          </div>
          <div className="space-y-1">
            {otherStatuses.map(userStatus => (
              <div 
                key={userStatus.userId}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-bg-surface-hover cursor-pointer transition-colors"
                onClick={() => onOpenViewer(userStatus)}
              >
                <div className="relative p-[2px] rounded-full ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-base">
                   <img 
                     src={userStatus.userAvatar || 'https://i.pravatar.cc/150'} 
                     className="w-11 h-11 rounded-full object-cover"
                     alt={userStatus.userName}
                   />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-main">{userStatus.userName}</h3>
                  <p className="text-xs text-text-muted">
                    Just now
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {otherStatuses.length === 0 && !myStatus && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mb-4 border border-glass-border">
                <FiPlus className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No status updates yet. Share your first moment!</p>
        </div>
      )}
    </div>
  );
};

export default StatusList;
