import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiHelpCircle, FiX, FiMapPin } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';

const ModernPopup = () => {
    const { popup, closePopup } = useChat();

    if (!popup.show) return null;

    const getIcon = () => {
        switch (popup.type) {
            case 'success': return <FiCheckCircle className="w-12 h-12 text-green-400" />;
            case 'error': return <FiAlertCircle className="w-12 h-12 text-red-500" />;
            case 'confirm': return <FiHelpCircle className="w-12 h-12 text-orange-400" />;
            case 'location': return <FiMapPin className="w-12 h-12 text-red-500" />;
            case 'destructive': return <FiAlertCircle className="w-12 h-12 text-red-500" />;
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
                        className="absolute inset-0 bg-black/80 md:bg-black/60 md:backdrop-blur-md"
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
                        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                            ['error', 'location', 'destructive'].includes(popup.type) ? 'bg-red-500/20' : 
                            popup.type === 'confirm' ? 'bg-orange-500/20' : 
                            popup.type === 'success' ? 'bg-green-500/20' : 
                            'bg-primary-500/20'
                        }`} />
                        
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
                                        className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold transition-all active:scale-95 shadow-lg ${
                                            ['destructive', 'error'].includes(popup.type) 
                                                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-500/20' 
                                                : popup.type === 'confirm'
                                                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-orange-500/20'
                                                    : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-primary-500/20'
                                        }`}
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
