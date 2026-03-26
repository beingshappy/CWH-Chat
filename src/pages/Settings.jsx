import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiBell, FiLock, FiLogOut, FiUser, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ToggleSwitch = ({ enabled, onChange, label, description, icon: Icon }) => (
  <div className="flex items-center justify-between p-4 rounded-xl hover:bg-bg-surface-hover transition-colors cursor-pointer" onClick={() => onChange(!enabled)}>
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg ${enabled ? 'bg-primary-500/20 text-primary-400' : 'bg-bg-surface text-text-muted'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-main">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
    </div>
    <div className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-primary-500' : 'bg-bg-surface-hover/50 border border-glass-border'} relative`}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
    </div>
  </div>
);

const Settings = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">

      {/* Header */}
      <div className="h-16 px-6 flex items-center space-x-4 bg-bg-surface/60 md:backdrop-blur-xl border-b border-glass-border z-10">
        <button onClick={() => navigate('/')} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-text-main font-semibold text-lg">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom p-4 sm:p-6 z-10">
        <div className="max-w-2xl mx-auto space-y-4">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:ring-1 hover:ring-primary-500/50 transition-all"
          onClick={() => navigate('/profile')}
        >
          <img
            src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName}&background=4f46e5&color=fff`}
            alt="Profile"
            className="w-14 h-14 rounded-full object-cover border-2 border-primary-500/30"
          />
          <div className="flex-1">
            <p className="text-text-main font-medium">{currentUser?.displayName || 'Unknown User'}</p>
            <p className="text-text-muted text-sm">{currentUser?.email}</p>
          </div>
          <FiChevronRight className="w-5 h-5 text-text-muted" />
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider">Notifications</h2>
          </div>
          <ToggleSwitch enabled={notifications} onChange={setNotifications} label="Push Notifications" description="Get notified when you receive messages" icon={FiBell} />
          <ToggleSwitch enabled={messagePreview} onChange={setMessagePreview} label="Message Preview" description="Show message content in notifications" icon={FiBell} />
        </motion.div>


        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Privacy</h2>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-bg-surface-hover transition-colors cursor-pointer" onClick={() => navigate('/profile')}>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-bg-surface text-text-muted"><FiUser className="w-4 h-4" /></div>
              <p className="text-sm font-medium text-text-main">Edit Profile</p>
            </div>
            <FiChevronRight className="w-5 h-5 text-text-muted" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-bg-surface-hover transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-bg-surface text-text-muted"><FiLock className="w-4 h-4" /></div>
              <p className="text-sm font-medium text-text-main">Change Password</p>
            </div>
            <FiChevronRight className="w-5 h-5 text-text-muted" />
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl sm:rounded-2xl font-medium transition-all flex items-center justify-center space-x-2"
          >
            <FiLogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </motion.div>
      </div>
    </div>
  </div>
);
};

export default Settings;
