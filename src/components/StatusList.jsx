import React from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { FiPlus } from 'react-icons/fi';
import { formatStatusTime } from '../utils/presence';

const StatusList = ({ onOpenCreator, onOpenViewer }) => {
  const { statuses } = useChat();
  const { currentUser } = useAuth();

  const myStatus = statuses.find(s => s.userId === currentUser.uid);
  const otherStatuses = statuses.filter(s => s.userId !== currentUser.uid);

  // Helper: check if a status is fully viewed
  const isFullyViewed = (status) => {
    if (!status?.stories?.length) return true;
    return status.stories.every(story => story.viewers?.includes(currentUser.uid));
  };

  const recentUpdates = otherStatuses.filter(s => !isFullyViewed(s));
  const viewedUpdates = otherStatuses.filter(s => isFullyViewed(s));

  const StatusItem = ({ userStatus, isViewed }) => (
    <div 
      className="flex items-center space-x-3 p-3 rounded-xl hover:bg-bg-surface-hover cursor-pointer transition-colors"
      onClick={() => onOpenViewer(userStatus)}
    >
      <div className={`relative p-[2px] rounded-full ${isViewed ? 'border border-white/10' : 'ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-base'}`}>
         <img 
           src={userStatus.userAvatar || 'https://i.pravatar.cc/150'} 
           className="w-11 h-11 rounded-full object-cover"
           alt={userStatus.userName}
         />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-medium truncate ${isViewed ? 'text-text-muted' : 'text-text-main'}`}>{userStatus.userName}</h3>
        <p className="text-xs text-text-muted whitespace-nowrap">
          {formatStatusTime(userStatus.stories[0]?.createdAt)}
        </p>
      </div>
    </div>
  );

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
              {myStatus ? `Uploaded ${formatStatusTime(myStatus.stories[0]?.createdAt)}` : 'Tap to add status update'}
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

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <>
          <div className="px-3 py-4 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Recent Updates
          </div>
          <div className="space-y-1">
            {recentUpdates.map(userStatus => (
              <StatusItem key={userStatus.userId} userStatus={userStatus} isViewed={false} />
            ))}
          </div>
        </>
      )}

      {/* Viewed Updates */}
      {viewedUpdates.length > 0 && (
        <>
          <div className="px-3 py-4 pb-2 text-[11px] font-bold text-text-muted/50 uppercase tracking-wider">
            Viewed Updates
          </div>
          <div className="space-y-1 opacity-80">
            {viewedUpdates.map(userStatus => (
              <StatusItem key={userStatus.userId} userStatus={userStatus} isViewed={true} />
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
