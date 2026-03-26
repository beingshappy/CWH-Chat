import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiHelpCircle, FiMapPin } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';

const ModernPopup = () => {
    const { popup, closePopup } = useChat();

    if (!popup.show) return null;

    const config = {
        success:     { icon: FiCheckCircle,  color: 'text-emerald-400', accent: 'border-emerald-500/20',  confirm: 'bg-emerald-600 hover:bg-emerald-500' },
        error:       { icon: FiAlertCircle,  color: 'text-red-400',     accent: 'border-red-500/20',      confirm: 'bg-red-600 hover:bg-red-500'       },
        destructive: { icon: FiAlertCircle,  color: 'text-red-400',     accent: 'border-red-500/20',      confirm: 'bg-red-600 hover:bg-red-500'       },
        confirm:     { icon: FiHelpCircle,   color: 'text-amber-400',   accent: 'border-amber-500/20',    confirm: 'bg-amber-600 hover:bg-amber-500'   },
        location:    { icon: FiMapPin,       color: 'text-red-400',     accent: 'border-red-500/20',      confirm: 'bg-red-600 hover:bg-red-500'       },
        info:        { icon: FiInfo,         color: 'text-blue-400',    accent: 'border-blue-500/20',     confirm: 'bg-blue-600 hover:bg-blue-500'     },
    };
    const c = config[popup.type] || config.info;
    const Icon = c.icon;

    const handleConfirm = () => {
        if (popup.onConfirm) popup.onConfirm();
        closePopup();
    };

    return (
        <AnimatePresence>
            {popup.show && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closePopup}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Compact Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 8 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                        className={`relative w-full max-w-xs bg-bg-surface/95 backdrop-blur-xl rounded-2xl border ${c.accent} shadow-2xl shadow-black/40 overflow-hidden`}
                    >
                        <div className="p-5">
                            {/* Icon + Title inline */}
                            <div className="flex items-center space-x-3 mb-2">
                                <Icon className={`w-5 h-5 flex-shrink-0 ${c.color}`} />
                                <h3 className="text-sm font-bold text-text-main leading-tight">{popup.title}</h3>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed pl-8">{popup.message}</p>
                        </div>

                        {/* Actions */}
                        <div className={`px-5 pb-4 flex space-x-2 ${popup.type !== 'confirm' ? 'justify-end' : ''}`}>
                            {popup.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={closePopup}
                                        className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted text-xs font-semibold transition-all border border-white/5 active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className={`flex-1 py-2 px-3 rounded-xl text-white text-xs font-semibold transition-all active:scale-95 ${c.confirm}`}
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closePopup}
                                    className="py-2 px-4 rounded-xl bg-white/8 hover:bg-white/15 text-text-main text-xs font-semibold transition-all border border-white/8 active:scale-95"
                                >
                                    Got it
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ModernPopup;
