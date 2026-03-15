import React, { useState, useEffect } from 'react';
import { FiX, FiBell, FiImage, FiFile, FiLink2, FiLogOut, FiTrash2, FiUserMinus, FiExternalLink } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, arrayRemove, deleteDoc, arrayUnion, query, collection, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import UserAvatar from './UserAvatar';
import { isActuallyOnline } from '../utils/presence';

const InfoPanel = ({ activeChat, close }) => {
  const { currentUser } = useAuth();
  const { users, setActiveChat } = useChat();

  const isGroup = activeChat?.isGroup;
  const isAdmin = activeChat?.admins?.includes(currentUser?.uid);

  // Resolve members for group chat
  const chatMembers = isGroup 
    ? users.filter(u => activeChat.members.includes(u.id))
    : [];

  const handleRemoveMember = async (userId) => {
    if (!isAdmin || !isGroup) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        members: arrayRemove(userId),
        admins: arrayRemove(userId)
      });
    } catch (e) { console.error('Remove member failed:', e); }
  };

  const handleLeaveGroup = async () => {
    if (!isGroup) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        members: arrayRemove(currentUser.uid),
        admins: arrayRemove(currentUser.uid)
      });
      close();
      setActiveChat(null);
    } catch (e) { console.error('Leave group failed:', e); }
  };

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const handleAddMember = async (userId) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        members: arrayUnion(userId)
      });
      setShowAddMember(false);
      setMemberSearch('');
    } catch (e) { console.error('Add member failed:', e); }
  };

  const nonMembers = users.filter(u => 
    !activeChat.members.includes(u.id) && 
    (u.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
     u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const [sharedMedia, setSharedMedia] = useState([]);
  const [sharedLinks, setSharedLinks] = useState([]);

  useEffect(() => {
    if (!activeChat?.id) return;

    const qShared = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(qShared, (snapshot) => {
      const media = [];
      const links = [];
      const urlRegex = /(https?:\/\/[^\s]+)/g;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.mediaUrl) {
          media.push({ id: docSnap.id, ...data });
        }
        if (data.text) {
          const matches = data.text.match(urlRegex);
          if (matches) {
            matches.forEach(url => {
              if (!links.some(l => l.url === url)) {
                links.push({ id: docSnap.id, url, timestamp: data.timestamp });
              }
            });
          }
        }
      });
      setSharedMedia(media.slice(0, 6)); // Show latest 6
      setSharedLinks(links.slice(0, 5)); // Show latest 5
    });

    return () => unsubscribe();
  }, [activeChat?.id]);

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-full bg-bg-surface backdrop-blur-2xl border-l border-glass-border flex flex-col z-[100] fixed inset-0 w-full lg:relative lg:w-80 lg:inset-auto lg:top-auto lg:left-auto"
    >
      <div className="h-16 px-4 flex items-center justify-between border-b border-glass-border">
        <h2 className="text-text-main font-medium">{isGroup ? 'Group Info' : 'Contact Info'}</h2>
        <button onClick={close} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom">
        {/* Profile Card */}
        <div className="flex flex-col items-center justify-center py-8 border-b border-glass-border px-4 text-center">
          <UserAvatar src={activeChat.avatar} name={activeChat.name} size="xl" online={isActuallyOnline(isGroup ? null : users.find(u => u.id === (activeChat.otherUserId || activeChat.id)))} />
          <h3 className="text-xl font-semibold text-text-main mt-4 mb-1">{activeChat.name}</h3>
          <p className="text-sm text-text-muted">
            {isGroup ? `${activeChat.members.length} members` : isActuallyOnline(users.find(u => u.id === (activeChat.otherUserId || activeChat.id))) ? 'Online' : formatLastSeen(users.find(u => u.id === (activeChat.otherUserId || activeChat.id))?.lastSeen)}
          </p>
          {isGroup && activeChat.description && (
            <p className="mt-3 text-sm text-text-muted leading-relaxed italic">
                "{activeChat.description}"
            </p>
          )}
        </div>

        {/* Group Members List */}
        {isGroup && (
          <div className="py-4 border-b border-glass-border">
            <div className="px-4 mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Members</h4>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-600">{chatMembers.length}</span>
                {isAdmin && (
                  <button 
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="text-[10px] bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded-full border border-primary-500/20 hover:bg-primary-500/20 transition-colors"
                  >
                    {showAddMember ? 'Cancel' : '+ Add'}
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showAddMember && isAdmin && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 mb-4 overflow-hidden"
                >
                  <input 
                    type="text" 
                    placeholder="Search users to add..." 
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto scrollbar-custom space-y-1">
                    {nonMembers.map(user => (
                      <div 
                        key={user.id} 
                        onClick={() => handleAddMember(user.id)}
                        className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2">
                          <UserAvatar src={user.avatar} name={user.name} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-primary-400 opacity-0 group-hover:opacity-100 uppercase font-bold transition-opacity">Add</span>
                      </div>
                    ))}
                    {nonMembers.length === 0 && memberSearch && (
                      <p className="text-[10px] text-slate-600 text-center py-2">No users found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {chatMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between px-4 py-2 hover:bg-bg-surface-hover transition-colors group">
                    <div className="flex items-center space-x-3">
                        <UserAvatar src={member.avatar} name={member.name} size="xs" online={isActuallyOnline(member)} />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-text-main truncate pr-4">
                                {member.id === currentUser.uid ? 'You' : member.name}
                                {activeChat.admins?.includes(member.id) && (
                                    <span className="ml-2 text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded border border-primary-500/20 uppercase">Admin</span>
                                )}
                            </p>
                        </div>
                    </div>
                    {isAdmin && member.id !== currentUser.uid && (
                        <button 
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove Member"
                        >
                            <FiUserMinus className="w-4 h-4" />
                        </button>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="py-4 border-b border-glass-border px-4 space-y-2">
          <div className="flex items-center justify-between p-3 hover:bg-bg-surface-hover rounded-xl cursor-pointer transition-colors group">
            <div className="flex items-center space-x-3 text-text-main">
               <FiBell className="w-5 h-5 text-text-muted" />
               <span className="text-sm font-medium">Mute Notifications</span>
            </div>
            <div className="w-10 h-5 bg-slate-700 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </div>
          </div>

          {isGroup ? (
            <button 
                onClick={handleLeaveGroup}
                className="w-full flex items-center space-x-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
                <FiLogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Leave Group</span>
            </button>
          ) : (
             <button className="w-full flex items-center space-x-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                <FiTrash2 className="w-5 h-5" />
                <span className="text-sm font-medium">Block contact</span>
            </button>
          )}
        </div>

        {/* Media & Links */}
        <div className="py-4 px-4 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Media & Links</h4>
            <span className="text-[10px] text-primary-400 font-bold uppercase cursor-pointer hover:underline">View All</span>
          </div>

          {sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {sharedMedia.map(item => (
                <div key={item.id} className="aspect-square bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-white/5 shadow-md">
                   {item.mediaType === 'image' || item.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img src={item.mediaUrl} alt="shared" className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-700/50">
                        <FiFile className="w-6 h-6 text-slate-400" />
                      </div>
                   )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 bg-slate-900/20 rounded-xl border border-dashed border-slate-800 mb-6">
               <FiImage className="w-6 h-6 text-slate-700 mb-2" />
               <p className="text-[10px] text-slate-600">No media shared yet</p>
            </div>
          )}

          <div className="space-y-2">
            {sharedLinks.map((link, idx) => (
              <a 
                key={`${link.id}-${idx}`}
                href={link.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center space-x-3 p-2.5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl border border-white/5 transition-all group"
              >
                <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400 group-hover:bg-primary-500/20">
                  <FiLink2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 truncate">{link.url.replace(/^https?:\/\//, '')}</p>
                </div>
                <FiExternalLink className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
            {sharedLinks.length === 0 && (
              <div className="flex items-center space-x-3 p-3 text-slate-600">
                <FiLink2 className="w-4 h-4 opacity-40" />
                <span className="text-[11px]">No links shared yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InfoPanel;
