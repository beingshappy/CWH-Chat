import React, { useState } from 'react';
import { FiSearch, FiSettings, FiLogOut, FiUsers, FiMessageSquare, FiCircle, FiPhone } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ChatList from './ChatList';
import CallList from './CallList';
import CreateGroupModal from './CreateGroupModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import StatusList from './StatusList';
import StatusCreator from './StatusCreator';

const Sidebar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const { currentUser, logout } = useAuth();
  const { users, chats, activeStatus, setActiveStatus, setActiveChat, currentUserProfile } = useChat();
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

  const filteredChats = chats.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TABS = [
    { id: 'chats', label: 'Chats', icon: FiMessageSquare },
    { id: 'status', label: 'Status', icon: FiCircle },
    { id: 'calls', label: 'Calls', icon: FiPhone },
    { id: 'users', label: 'Directory', icon: FiUsers },
  ];

  return (
    <>
      <AnimatePresence>
        {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} />}
        {showCreator && <StatusCreator onClose={() => setShowCreator(false)} />}
      </AnimatePresence>

      <div className="w-full h-full flex flex-col bg-sidebar-premium z-20 relative transition-all duration-300 min-h-0">
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between bg-bg-surface/60 backdrop-blur-2xl border-b border-glass-border flex-shrink-0">
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group min-w-0"
            onClick={() => navigate('/profile')}
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentUser?.photoURL || 'https://i.pravatar.cc/150'}
                alt="My Profile"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary-500/20 group-hover:border-primary-500 transition-all duration-300"
              />
              <div className="absolute bottom-0.5 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-bg-surface shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-text-main group-hover:text-primary-400 transition-colors truncate">
                {currentUser?.displayName || 'User'}
              </h2>
              <p className="text-[9px] text-primary-500/50 font-semibold tracking-wide truncate">
                {currentUserProfile?.status || 'Available'}
              </p>
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
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-primary-500/10 rounded-xl text-sm text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500/40 focus:bg-white/10 transition-all placeholder:text-[11px] placeholder:tracking-tight"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Tabs (Visible on md+) */}
        <div className="hidden md:flex p-2 space-x-1 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-colors capitalize ${
                activeTab === tab.id
                  ? 'text-text-main bg-bg-surface shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Lists based on active tab */}
        <div 
          className="flex-1 overflow-y-scroll scrollbar-custom pb-20 md:pb-0 relative" 
          style={{ overscrollBehaviorY: 'contain', scrollbarGutter: 'stable' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-full"
            >
              {activeTab === 'status' ? (
                 <StatusList 
                   onOpenCreator={() => setShowCreator(true)} 
                   onOpenViewer={(status) => {
                     setActiveChat(null); 
                     setActiveStatus(status);
                   }} 
                 />
              ) : activeTab === 'calls' ? (
                <CallList />
              ) : (
                <ChatList 
                  activeTab={activeTab === 'users' ? 'users' : 'chats'} 
                  searchQuery={searchQuery} 
                  filteredUsers={filteredUsers} 
                  filteredChats={filteredChats}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Glass HUD Navigation (Mobile/Tablet) */}
        <div className="md:hidden fixed bottom-8 left-4 right-4 z-[100] flex justify-center pointer-events-none">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm bg-bg-main/60 backdrop-blur-3xl border border-primary-500/20 rounded-[2.5rem] p-1.5 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative overflow-hidden"
          >
            {/* Ambient Background Glow for Active Tab */}
            <AnimatePresence>
                {TABS.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    if (!isActive) return null;
                    return (
                        <motion.div
                            key="active-glow"
                            layoutId="active-nav-glow"
                            className="absolute bg-primary-500/10 blur-2xl rounded-full"
                            style={{ 
                                width: '25%', 
                                left: `${(idx * 25)}%`,
                                height: '100%',
                                top: 0 
                            }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    );
                })}
            </AnimatePresence>

            {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="relative flex flex-col items-center justify-center space-y-1 transition-all flex-1 py-3 rounded-[2rem] z-10"
                    >
                        {isActive && (
                            <motion.div
                                layoutId="nav-pill"
                                className="absolute inset-x-2 inset-y-1 bg-primary-500/10 border border-primary-500/20 rounded-[2rem] z-0"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Icon className={`w-5 h-5 z-10 transition-transform duration-300 ${isActive ? 'text-primary-400 scale-110' : 'text-text-muted opacity-60'}`} />
                        <span className={`text-[10px] font-semibold z-10 transition-colors duration-300 ${isActive ? 'text-primary-300' : 'text-text-muted opacity-40'}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
