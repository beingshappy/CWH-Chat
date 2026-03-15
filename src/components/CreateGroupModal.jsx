import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiSearch, FiUsers } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { db } from '../firebase/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const CreateGroupModal = ({ onClose }) => {
  const { users } = useChat();
  const { currentUser } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  const toggleUser = (user) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 1) return;
    setCreating(true);
    try {
      await addDoc(collection(db, 'chats'), {
        isGroup: true,
        name: groupName,
        members: [currentUser.uid, ...selected.map(u => u.id)],
        admins: [currentUser.uid],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=4f46e5&color=fff`,
        description: description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
      });
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md glass-card rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2 text-white">
            <FiUsers className="w-5 h-5 text-primary-400" />
            <h2 className="font-semibold">Create Group</h2>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Group Name */}
          <input
            type="text"
            placeholder="Group name…"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface/50 border border-glass-border text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
          />

          {/* Group Description */}
          <textarea
            placeholder="Group description (optional)…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface/50 border border-glass-border text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm resize-none h-20"
          />

          {/* Member Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-surface/50 border border-glass-border text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all text-sm"
            />
          </div>

          {/* Selected badges */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <span key={u.id} className="flex items-center space-x-1.5 bg-primary-500/20 border border-primary-500/30 rounded-full pl-1 pr-2 py-0.5">
                  <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-xs text-primary-300 font-medium">{u.name}</span>
                  <button onClick={() => toggleUser(u)} className="text-primary-400 hover:text-red-400 transition-colors ml-0.5">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User List */}
          <div className="max-h-48 overflow-y-auto scrollbar-custom space-y-1">
            {filtered.map(user => {
              const isSelected = selected.find(u => u.id === user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className={`flex items-center space-x-3 p-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-white/5'}`}
                >
                  <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <FiCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selected.length < 1}
            className="w-full py-3 bg-gradient-primary hover:opacity-90 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
          >
            {creating ? 'Creating…' : `Create Group (${selected.length} members)`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CreateGroupModal;
