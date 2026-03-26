import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ─── First-Time Permission Prompt Card ──────────────────────────────────────
const NotificationPrompt = ({ onAllow, onSkip }) => (
  <motion.div
    initial={{ opacity: 0, y: 60 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 60 }}
    transition={{ type: 'spring', damping: 22, stiffness: 280 }}
    className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-sm"
  >
    <div className="bg-bg-surface/95 backdrop-blur-2xl border border-primary-500/20 rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-start space-x-3">
      <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0 border border-primary-500/20 mt-0.5">
        <FiBell className="w-5 h-5 text-primary-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-main">Enable Notifications</p>
        <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">Get notified about new messages and incoming calls even when you switch tabs.</p>
        <div className="flex space-x-2 mt-3">
          <button
            onClick={onAllow}
            className="flex-1 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-all active:scale-95"
          >
            Allow
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted text-xs font-medium transition-all active:scale-95 border border-white/5"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

export const NotificationProvider = ({ children }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { chats, activeChat, activeCall, users } = useChat();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const prevUnreadRef = useRef({});
  const prevCallIdRef = useRef(null);

  // ── Auto-Clear Notifications when Chat Opens ──────────────────────────────
  useEffect(() => {
    if (activeChat && 'Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        registration.getNotifications({ tag: `chat_${activeChat.id}` }).then(notifications => {
          notifications.forEach(n => n.close());
        });
      });
    }
  }, [activeChat?.id]);

  // ── Show first-time prompt logic ──────────────────────────────────────────
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const seen = localStorage.getItem('cwh_notif_prompted');
    if (seen) return;
    const t = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleAllow = async () => {
    setShowPrompt(false);
    localStorage.setItem('cwh_notif_prompted', '1');
    try {
      await Notification.requestPermission();
    } catch (e) {}
  };

  const handleSkip = () => {
    setShowPrompt(false);
    localStorage.setItem('cwh_notif_prompted', '1');
  };

  // ── Incoming Call Handlers ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall || !currentUser || activeCall.status !== 'ringing') return;
    if (activeCall.callerId === currentUser.uid) return;
    if (activeCall.id === prevCallIdRef.current) return;
    prevCallIdRef.current = activeCall.id;

    // OS Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('[NotificationProvider] Showing call notification for:', activeCall.callerName);
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(`Incoming Call`, {
          body: `${activeCall.callerName} is calling you`,
          icon: activeCall.callerPhoto || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'call_' + activeCall.id,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: { url: window.location.origin }
        });
      }).catch(err => console.error('[NotificationProvider] SW Error:', err));
    } else {
      console.warn('[NotificationProvider] Cannot show OS notification. Permission:', Notification?.permission);
    }
  }, [activeCall?.id, activeCall?.status]);

  // ── New Message Handlers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !chats) return;

    chats.forEach(chat => {
      const currentUnread = chat.unreadCount?.[currentUser.uid] || 0;
      const prevUnread = prevUnreadRef.current[chat.id] || 0;

      if (currentUnread > prevUnread && currentUnread > 0) {
        if (activeChat?.id === chat.id) {
          prevUnreadRef.current[chat.id] = currentUnread;
          return;
        }

        let displayName = chat.name || 'Someone';
        let displayPhoto = chat.photo || '/icon-192x192.png';

        if (!chat.isGroup && (!chat.name || chat.name === 'Someone')) {
          const otherId = chat.members.find(m => m !== currentUser.uid);
          const otherUser = users.find(u => u.id === otherId);
          if (otherUser) {
            displayName = otherUser.name || 'Someone';
            displayPhoto = otherUser.avatar || displayPhoto;
          }
        }

        console.log('[NotificationProvider] New message from:', displayName);

        // OS Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(displayName, {
              body: chat.lastMessage || 'New message',
              icon: displayPhoto,
              badge: '/icon-192x192.png',
              tag: `chat_${chat.id}`,
              vibrate: [100, 50, 100],
              data: { url: window.location.origin }
            });
          });
        }

        // In-App Toast
        addToast({
          type: 'message',
          title: displayName,
          body: chat.lastMessage || 'Sent you a message',
          avatar: displayPhoto,
          onClick: () => window.focus(),
        });
      }
      prevUnreadRef.current[chat.id] = currentUnread;
    });
  }, [chats, currentUser, activeChat, users, addToast]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showPrompt && (
          <NotificationPrompt onAllow={handleAllow} onSkip={handleSkip} />
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationProvider;
