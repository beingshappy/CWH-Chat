import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiPhone, FiVideo, FiX } from 'react-icons/fi';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

// ─── Sound Helper (Web Audio API) ──────────────────────────
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
  } catch (e) {}
};

const ToastCard = ({ toast, onDismiss }) => {
  const isCall = toast.type === 'call';
  const Icon = isCall ? (toast.callType === 'video' ? FiVideo : FiPhone) : FiMessageSquare;
  
  // Type-based colors
  const typeColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-primary-500',
    call: 'bg-green-500',
    message: 'bg-primary-500'
  };
  const iconBg = typeColors[toast.type] || typeColors.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      onClick={() => { toast.onClick?.(); onDismiss(toast.id); }}
      className="flex items-center space-x-3 w-full max-w-sm bg-bg-surface/90 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40 cursor-pointer hover:bg-bg-surface transition-all active:scale-[0.98] pointer-events-auto"
    >
      <div className="relative flex-shrink-0">
        {toast.avatar ? (
          <img src={toast.avatar} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
        ) : (
          <div className={`w-10 h-10 rounded-full ${iconBg}/20 flex items-center justify-center text-white font-bold text-sm border border-white/10`}>
            {toast.title?.charAt(0) || '?'}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg ${iconBg}`}>
          <Icon className="w-2.5 h-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-main truncate">{toast.title}</p>
        <p className="text-[11px] text-text-muted truncate mt-0.5">{toast.body}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="p-1.5 rounded-full text-text-muted hover:text-text-main hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(t => [{ ...toast, id }, ...t].slice(0, 3));
    playNotificationSound();
    setTimeout(() => dismiss(id), 5000);
    return id;
  }, [dismiss]);

  const showToast = useCallback((title, body, type = 'info', options = {}) => {
    return addToast({ title, body, type, ...options });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showToast, dismiss }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col space-y-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
