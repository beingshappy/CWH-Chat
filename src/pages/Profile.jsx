import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiArrowLeft, FiSave, FiUser, FiMail, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db, storage } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
const Profile = () => {
  const { currentUser } = useAuth();
  const { currentUserProfile } = useChat();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [status, setStatus] = useState(currentUserProfile?.status || 'Hey there! I am using CWH Chat.');
  const [bio, setBio] = useState(currentUserProfile?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.photoURL || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (currentUserProfile) {
      if (currentUserProfile.status) setStatus(currentUserProfile.status);
      if (currentUserProfile.bio) setBio(currentUserProfile.bio);
    }
  }, [currentUserProfile]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      let photoURL = currentUser.photoURL;

      if (avatarFile) {
        const { uploadImage } = await import('../utils/imageUpload');
        photoURL = await uploadImage(avatarFile);
      }

      await updateProfile(currentUser, { displayName, photoURL });
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: displayName,
        avatar: photoURL,
        status,
        bio,
        lastSeen: serverTimestamp(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">

      {/* Header */}
      <div className="h-16 px-6 flex items-center space-x-4 bg-bg-surface/60 md:backdrop-blur-xl border-b border-glass-border z-10">
        <button onClick={() => navigate('/')} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-text-main font-semibold text-lg">Edit Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom p-4 sm:p-6 z-10">
        <div className="max-w-xl mx-auto py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 sm:p-8"
        >
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <img
                src={avatarPreview || `https://ui-avatars.com/api/?name=${displayName}&background=3b82f6&color=fff`}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-bg-surface group-hover:border-primary-500 transition-colors shadow-xl"
              />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <FiCamera className="w-8 h-8 text-white" />
              </div>
            </div>
            <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" />
            <p className="mt-2 text-xs text-text-muted">Click to change avatar</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-text-muted mb-1.5">
                <FiUser className="w-4 h-4 text-primary-400" />
                <span>Display Name</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface/50 border border-glass-border text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-text-muted mb-1.5">
                <FiMail className="w-4 h-4 text-primary-400" />
                <span>Email</span>
              </label>
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-xl bg-bg-surface/30 border border-glass-border/30 text-text-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-text-muted mb-1.5">
                <FiFileText className="w-4 h-4 text-primary-400" />
                <span>Bio</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface/50 border border-glass-border text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Status</label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface/50 border border-glass-border text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <p className="text-right text-[10px] text-text-muted mt-1 font-bold uppercase tracking-widest">{status.length}/80</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6 py-3 px-4 bg-gradient-primary hover:opacity-90 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20 disabled:opacity-60"
          >
            <FiSave className="w-5 h-5" />
            <span>{saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Profile'}</span>
          </button>
        </motion.div>
      </div>
    </div>
  </div>
);
};

export default Profile;
