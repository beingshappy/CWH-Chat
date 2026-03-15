import React, { useCallback } from 'react';
import ChatItem from './ChatItem';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { isActuallyOnline, formatLastSeen } from '../utils/presence';
import { ChatListSkeleton } from './Skeletons';

const ChatList = ({ activeTab, searchQuery, filteredUsers, filteredChats = [] }) => {
  const { chats, activeChat, setActiveChat, startDirectMessage, users, loading, syncProfile, setActiveStatus } = useChat();
  const { currentUser } = useAuth();

  // Resolve display info for a DM chat (other participant's name/avatar)
  const resolveChatMeta = (chat) => {
    if (chat.isGroup) return chat;
    const otherUid = chat.members?.find(uid => uid !== currentUser?.uid);
    const other = users.find(u => u.id === otherUid);
    return {
      ...chat,
      name: chat.name || other?.name || 'Unknown',
      avatar: chat.avatar || other?.avatar || `https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff`,
      online: isActuallyOnline(other),
      unread: chat.unreadCount?.[currentUser?.uid] || 0,
      otherUserId: otherUid, // Crucial for calling
    };
  };

  const handleUserClick = useCallback(async (user) => {
    try {
      setActiveStatus(null);
      await startDirectMessage(user);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  }, [setActiveStatus, startDirectMessage]);

  const sortedChats = [...(searchQuery ? filteredChats : chats)].sort((a, b) => {
    const isAPinned = a.pinnedBy?.includes(currentUser?.uid);
    const isBPinned = b.pinnedBy?.includes(currentUser?.uid);
    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    
    const timeA = a.updatedAt?.toDate?.() || 0;
    const timeB = b.updatedAt?.toDate?.() || 0;
    return timeB - timeA;
  });

  if (loading) {
    return <ChatListSkeleton />;
  }

  return (
    <div className="px-2 space-y-1 py-2 min-h-0">
      {activeTab === 'chats' ? (
        sortedChats.length > 0 ? (
          sortedChats.map((chat) => {
            const resolved = resolveChatMeta(chat);
            return (
              <ChatItem
                key={chat.id}
                chat={resolved}
                active={activeChat?.id === chat.id}
                onClick={() => {
                  setActiveStatus(null);
                  setActiveChat(resolved);
                }}
              />
            );
          })
        ) : (
          <div className="text-center text-text-muted mt-8 text-sm px-4">
            <p className="mb-1">No chats yet</p>
            <p className="text-xs text-text-muted/80">Switch to Directory to start a conversation</p>
          </div>
        )
      ) : (
        filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <ChatItem
              key={user.id}
              isGlobalDirectory={true}
              chat={{
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                online: isActuallyOnline(user),
                lastMessage: isActuallyOnline(user) ? (user.status || 'Hey there!') : formatLastSeen(user.lastSeen),
                updatedAt: user.lastSeen
              }}
              onClick={() => handleUserClick(user)}
            />
          ))
        ) : (
          <div className="text-center mt-10 px-6 pb-10">
            <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-glass-border">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-text-main font-semibold mb-2">No users found</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              To chat with another account, that user must log in to this app **at least once** to register their profile.
            </p>
            
            <button
              onClick={syncProfile}
              className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors mb-6 shadow-lg shadow-primary-500/20"
            >
              Force Sync My Profile
            </button>

            <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/20">
              <p className="text-[11px] text-primary-400 font-medium">Quick Tip for Testing:</p>
              <p className="text-[10px] text-text-muted mt-1 text-left">
                1. Open an Incognito window<br/>
                2. Log in with your <u>other</u> account<br/>
                3. Refresh this page to see them!
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ChatList;
