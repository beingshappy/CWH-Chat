import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiVideo, FiMessageSquare, FiX } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

// ─── Toast Context ──────────────────────────────────────────────────────────
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

// ─── Sound Helper (Web Audio API — no file needed) ──────────────────────────
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // silently fail if audio context blocked
  }
};

// ─── Individual Toast Card ───────────────────────────────────────────────────
const ToastCard = ({ toast, onDismiss }) => {
  const isCall = toast.type === 'call';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      onClick={toast.onClick}
      className="flex items-center space-x-3 w-full max-w-sm bg-bg-surface/90 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40 cursor-pointer hover:bg-bg-surface transition-all active:scale-[0.98]"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {toast.avatar ? (
          <img src={toast.avatar} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm border border-primary-500/20">
            {toast.title?.charAt(0) || '?'}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg ${isCall ? 'bg-green-500' : 'bg-primary-500'}`}>
          {isCall
            ? (toast.callType === 'video' ? <FiVideo className="w-2.5 h-2.5" /> : <FiPhone className="w-2.5 h-2.5" />)
            : <FiMessageSquare className="w-2.5 h-2.5" />
          }
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-main truncate">{toast.title}</p>
        <p className="text-[11px] text-text-muted truncate mt-0.5">{toast.body}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="p-1.5 rounded-full text-text-muted hover:text-text-main hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

import { FiBell } from 'react-icons/fi';

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

// ─── Provider + NotificationManager combined ────────────────────────────────
export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const { chats, activeChat, activeCall, users } = useChat();
  const { currentUser } = useAuth();
  const prevUnreadRef = useRef({});
  const prevCallIdRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(t => [{ ...toast, id }, ...t].slice(0, 3)); // max 3 toasts
    playNotificationSound();
    setTimeout(() => dismiss(id), 5000); // auto-dismiss after 5s
    return id;
  }, [dismiss]);

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

  // ── Show first-time prompt after 2s if permission not yet set ─────────────
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const seen = localStorage.getItem('cwh_notif_prompted');
    if (seen) return;
    const t = setTimeout(() => setShowPrompt(true), 2000);
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

  // ── Incoming Call Toasts ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall || !currentUser) return;
    if (activeCall.status !== 'ringing') return;
    if (activeCall.callerId === currentUser.uid) return; // I'm the caller
    if (activeCall.id === prevCallIdRef.current) return; // already showed
    prevCallIdRef.current = activeCall.id;

    // OS Notification (with avatar support via icon field)
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(`Incoming Call`, {
          body: `${activeCall.callerName} is calling you via CWH Chat`,
          icon: activeCall.callerPhoto || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'call_' + activeCall.id,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          actions: [
            { action: 'open', title: 'Answer Call' }
          ],
          data: { url: window.location.origin }
        });
      });
    }

    // In-app toast
    addToast({
      type: 'call',
      callType: activeCall.type,
      title: activeCall.callerName || 'Incoming Call',
      body: `Incoming ${activeCall.type} call`,
      avatar: activeCall.callerPhoto,
      onClick: () => window.focus(),
    });
  }, [activeCall?.id, activeCall?.status]);

  // ── New Message Toasts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !chats) return;

    chats.forEach(chat => {
      const currentUnread = chat.unreadCount?.[currentUser.uid] || 0;
      const prevUnread = prevUnreadRef.current[chat.id] || 0;

      if (currentUnread > prevUnread && currentUnread > 0) {
        // Skip if this is the currently active open chat
        const isActiveChat = activeChat?.id === chat.id;
        if (isActiveChat) {
          prevUnreadRef.current[chat.id] = currentUnread;
          return;
        }

        // Logic to find real Name and Avatar if it's a 1-on-1 chat
        let displayName = chat.name || 'Someone';
        let displayPhoto = chat.photo || '/icon-192x192.png';

        if (!chat.isGroup && (!chat.name || chat.name === 'Someone')) {
          const otherId = chat.members.find(m => m !== currentUser.uid);
          const otherUser = users.find(u => u.id === otherId);
          if (otherUser) {
            displayName = otherUser.name || otherUser.displayName || 'Someone';
            displayPhoto = otherUser.avatar || otherUser.photoURL || displayPhoto;
          }
        }

        // OS Notification
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(displayName, {
              body: chat.lastMessage || 'New message on CWH Chat',
              icon: displayPhoto,
              badge: '/icon-192x192.png',
              tag: `chat_${chat.id}`,
              vibrate: [100, 50, 100],
              actions: [
                { action: 'open', title: 'View Message' }
              ],
              data: { url: window.location.origin }
            });
          });
        }

        // In-app toast (always show when different chat is active)
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
  }, [chats, currentUser, activeChat, users]);

  return (
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      {/* First-time permission prompt */}
      <AnimatePresence>
        {showPrompt && (
          <NotificationPrompt onAllow={handleAllow} onSkip={handleSkip} />
        )}
      </AnimatePresence>
      {/* Toast Container — top center, safe below status bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col space-y-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastCard toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default NotificationProvider;
