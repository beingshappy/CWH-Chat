import React, { useState, useEffect } from 'react';
import { FiX, FiBell, FiImage, FiFile, FiLink2, FiLogOut, FiTrash2, FiUserMinus, FiExternalLink, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, arrayRemove, deleteDoc, arrayUnion, query, collection, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import UserAvatar from './UserAvatar';
import { isActuallyOnline, formatLastSeen } from '../utils/presence';

const InfoPanel = ({ activeChat, close }) => {
  const { currentUser } = useAuth();
  const { users, setActiveChat, toggleMuteChat, updateChatWallpaper, toggleBlockUser, currentUserProfile } = useChat();

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
  
  const handlePromoteAdmin = async (userId) => {
    if (!isAdmin || !isGroup) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        admins: arrayUnion(userId)
      });
    } catch (e) { console.error('Promote admin failed:', e); }
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

  const WALLPAPER_PRESETS = [
    { category: 'Noir', items: [
      { name: 'Onyx', url: '/wallpapers/onyx.png' },
      { name: 'Obsidian', url: '/wallpapers/obsidian.png' },
      { name: 'Midnight', url: '/wallpapers/midnight.png' },
      { name: 'Carbon', url: '/wallpapers/carbon.png' }
    ]},
    { category: 'Aurora', items: [
      { name: 'Sapphire', url: '/wallpapers/sapphire.png' },
      { name: 'Emerald', url: '/wallpapers/emerald.png' },
      { name: 'Ruby', url: '/wallpapers/ruby.png' },
      { name: 'Ethereal', url: '/wallpapers/ethereal.png' }
    ]},
    { category: 'Nature', items: [
      { name: 'Mist', url: '/wallpapers/mist.png' },
      { name: 'Forest', url: '/wallpapers/forest.png' },
      { name: 'Ocean', url: '/wallpapers/ocean.png' },
      { name: 'Canyon', url: '/wallpapers/canyon.png' }
    ]},
    { category: 'Abstract', items: [
      { name: 'Gold', url: '/wallpapers/gold.png' },
      { name: 'Cyber', url: '/wallpapers/cyber.png' },
      { name: 'Silk', url: '/wallpapers/silk.png' },
      { name: 'Cosmic', url: '/wallpapers/cosmic.png' }
    ]},
    { category: 'Minimal', items: [
      { name: 'Smoke', url: '/wallpapers/smoke.png' },
      { name: 'Shade', url: '/wallpapers/shade.jpg' },
      { name: 'Paper', url: '/wallpapers/paper.jpg' },
      { name: 'Airy', url: '/wallpapers/airy.jpg' }
    ]}
  ];

  return (
    <div className="h-full bg-sidebar-premium backdrop-blur-2xl flex flex-col z-[100] w-full relative">
      <div className="h-16 px-4 flex items-center justify-between bg-sidebar-premium border-b border-glass-border">
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
              <h4 className="text-[11px] font-semibold text-text-muted/60">Members</h4>
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
                    className="w-full bg-bg-surface border border-glass-border rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 mb-2"
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
                            <p className="text-xs font-medium text-text-main truncate">{user.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-primary-400 opacity-0 group-hover:opacity-100 font-semibold transition-opacity">Add</span>
                      </div>
                    ))}
                    {nonMembers.length === 0 && memberSearch && (
                      <p className="text-[10px] text-text-muted text-center py-2">No users found</p>
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
                                    <span className="ml-2 text-[9px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded border border-primary-500/20 font-medium">Admin</span>
                                )}
                            </p>
                        </div>
                    </div>
                    {isAdmin && member.id !== currentUser.uid && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                            {!activeChat.admins?.includes(member.id) && (
                                <button 
                                    onClick={() => handlePromoteAdmin(member.id)}
                                    className="p-1.5 text-text-muted hover:text-primary-400 hover:bg-primary-500/10 rounded-lg"
                                    title="Make Admin"
                                >
                                    <FiCheckCircle className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                title="Remove Member"
                            >
                                <FiUserMinus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personalization Section */}
        <div className="py-6 border-b border-glass-border px-4">
          <h4 className="text-[11px] font-semibold text-text-muted/60 mb-4 uppercase tracking-widest">Personalization</h4>
          
          <div className="space-y-6">
            <button
                onClick={() => updateChatWallpaper(activeChat.id, '')}
                className={`w-full py-2.5 rounded-xl border-2 transition-all text-xs font-semibold ${!activeChat.wallpapers?.[currentUser?.uid] ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-glass-border text-text-muted hover:border-white/10'}`}
            >
                Reset to Default
            </button>

            {WALLPAPER_PRESETS.map(cat => (
              <div key={cat.category}>
                <p className="text-[10px] text-text-muted/60 uppercase tracking-widest font-bold mb-3">{cat.category}</p>
                <div className="grid grid-cols-4 gap-2">
                  {cat.items.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => updateChatWallpaper(activeChat.id, preset.url)}
                      className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all relative group ${activeChat.wallpapers?.[currentUser?.uid] === preset.url ? 'border-primary-500 scale-105 shadow-lg shadow-primary-500/20 z-10' : 'border-glass-border hover:border-white/20'}`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                        <span className="text-[8px] text-white/90 font-medium">{preset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="py-4 border-b border-glass-border px-4 space-y-2">
          <div 
            onClick={() => toggleMuteChat(activeChat.id)}
            className="flex items-center justify-between p-3 hover:bg-bg-surface-hover rounded-xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-3 text-text-main">
               <FiBell className={`w-5 h-5 ${activeChat.mutedBy?.includes(currentUser?.uid) ? 'text-orange-400' : 'text-text-muted'}`} />
               <span className="text-sm font-medium">Mute Notifications</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors border ${activeChat.mutedBy?.includes(currentUser?.uid) ? 'bg-orange-500/20 border-orange-500/50' : 'bg-bg-surface border-glass-border'}`}>
              <motion.div 
                animate={{ x: activeChat.mutedBy?.includes(currentUser?.uid) ? 20 : 2 }}
                className={`w-4 h-4 rounded-full absolute top-0.5 shadow-sm ${activeChat.mutedBy?.includes(currentUser?.uid) ? 'bg-orange-400' : 'bg-text-muted/40'}`}
              />
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
            <button 
               onClick={() => toggleBlockUser(activeChat.otherUserId || activeChat.id)}
               className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-colors ${currentUserProfile?.blockedUsers?.includes(activeChat.otherUserId || activeChat.id) ? 'text-green-400 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
            >
               <FiTrash2 className="w-5 h-5" />
               <span className="text-sm font-medium">
                 {currentUserProfile?.blockedUsers?.includes(activeChat.otherUserId || activeChat.id) ? 'Unblock Contact' : 'Block Contact'}
               </span>
            </button>
          )}
        </div>

        {/* Media & Links */}
        <div className="py-4 px-4 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-semibold text-text-muted/60">Media & Links</h4>
            <span className="text-[10px] text-primary-400 font-semibold cursor-pointer hover:underline">View all</span>
          </div>

          {sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {sharedMedia.map(item => (
                <div key={item.id} className="aspect-square bg-bg-surface-hover rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-glass-border shadow-md">
                   {item.mediaType === 'image' || item.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img src={item.mediaUrl} alt="shared" className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bg-surface/50">
                        <FiFile className="w-6 h-6 text-text-muted" />
                      </div>
                   )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 bg-bg-surface/20 rounded-xl border border-dashed border-glass-border mb-6">
               <FiImage className="w-6 h-6 text-text-muted/40 mb-2" />
               <p className="text-[10px] text-text-muted/60">No media shared yet</p>
            </div>
          )}

          <div className="space-y-2">
            {sharedLinks.map((link, idx) => (
              <a 
                key={`${link.id}-${idx}`}
                href={link.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center space-x-3 p-2.5 bg-bg-surface/40 hover:bg-bg-surface/80 rounded-xl border border-glass-border transition-all group"
              >
                <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400 group-hover:bg-primary-500/20">
                  <FiLink2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-main/80 truncate">{link.url.replace(/^https?:\/\//, '')}</p>
                </div>
                <FiExternalLink className="w-3.5 h-3.5 text-text-muted/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
            {sharedLinks.length === 0 && (
              <div className="flex items-center space-x-3 p-3 text-text-muted/60">
                <FiLink2 className="w-4 h-4 opacity-40" />
                <span className="text-[11px]">No links shared yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
