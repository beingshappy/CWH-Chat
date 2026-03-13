import React, { useState } from 'react';
import { FiSearch, FiSettings, FiLogOut, FiUsers } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ChatList from './ChatList';
import CallList from './CallList';
import CreateGroupModal from './CreateGroupModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const Sidebar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const { currentUser, logout } = useAuth();
  const { users } = useChat();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { 
      await logout(); 
      navigate('/login', { replace: true });
    } catch (e) { 
      console.error(e); 
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <AnimatePresence>
        {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} />}
      </AnimatePresence>

      <div className="w-full h-full flex flex-col bg-bg-surface/40 backdrop-blur-xl z-20 relative transition-all duration-300 min-h-0">
        {/* Header */}
        <div className="p-3 sm:p-4 flex items-center justify-between border-b border-glass-border flex-shrink-0">
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group min-w-0"
            onClick={() => navigate('/profile')}
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentUser?.photoURL || 'https://i.pravatar.cc/150'}
                alt="My Profile"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-slate-700 group-hover:border-primary-500 transition-colors"
              />
              <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full border border-slate-900" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-main group-hover:text-primary-400 transition-colors truncate">
                {currentUser?.displayName || 'User'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-text-muted">Available</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => setShowGroupModal(true)}
              title="Create Group"
              className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors"
            >
              <FiUsers className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              title="Settings"
              className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors"
            >
              <FiSettings className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors"
            >
              <FiLogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-text-muted" />
            </div>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-bg-surface/50 border border-glass-border rounded-xl text-sm text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-bg-surface transition-all"
              placeholder="Search users or chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 space-x-1 flex-shrink-0">
          {['chats', 'calls', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'text-text-main bg-bg-surface shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-bg-surface-hover'
              }`}
            >
              {tab === 'chats' ? 'Chats' : tab === 'calls' ? 'Calls' : 'Directory'}
            </button>
          ))}
        </div>
        {/* Lists based on active tab */}
        {activeTab === 'calls' ? (
          <CallList />
        ) : (
          <ChatList activeTab={activeTab === 'users' ? 'users' : 'chats'} searchQuery={searchQuery} filteredUsers={filteredUsers} />
        )}
      </div>
    </>
  );
};

export default Sidebar;
