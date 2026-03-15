import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiHelpCircle, FiX } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';

const ModernPopup = () => {
    const { popup, closePopup } = useChat();

    if (!popup.show) return null;

    const getIcon = () => {
        switch (popup.type) {
            case 'success': return <FiCheckCircle className="w-12 h-12 text-green-400" />;
            case 'error': return <FiAlertCircle className="w-12 h-12 text-red-400" />;
            case 'confirm': return <FiHelpCircle className="w-12 h-12 text-primary-400" />;
            default: return <FiInfo className="w-12 h-12 text-blue-400" />;
        }
    };

    const handleConfirm = () => {
        if (popup.onConfirm) popup.onConfirm();
        closePopup();
    };

    return (
        <AnimatePresence>
            {popup.show && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closePopup}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="relative w-full max-w-sm glass-card rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center overflow-hidden"
                    >
                        {/* Decorative background element */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="mb-6 p-4 rounded-full bg-white/5 border border-white/5">
                            {getIcon()}
                        </div>

                        <h3 className="text-xl font-bold text-text-main mb-3">{popup.title}</h3>
                        <p className="text-sm text-text-muted mb-8 leading-relaxed">
                            {popup.message}
                        </p>

                        <div className="flex w-full space-x-3">
                            {popup.type === 'confirm' ? (
                                <>
                                    <button 
                                        onClick={closePopup}
                                        className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-text-main font-semibold transition-all border border-white/5 active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirm}
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={closePopup}
                                    className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-text-main font-semibold transition-all border border-white/10 active:scale-95"
                                >
                                    Got it
                                </button>
                            )}
                        </div>

                        <button 
                            onClick={closePopup}
                            className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-main rounded-full hover:bg-white/5 transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ModernPopup;
