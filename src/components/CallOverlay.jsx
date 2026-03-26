import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiVideo, FiX, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const CallOverlay = () => {
    const { currentUser } = useAuth();
    const { activeCall, endCall, acceptCall } = useChat();
    const videoContainerRef = useRef(null);
    const zpRef = useRef(null); // Added zpRef
    const [isZegoJoined, setIsZegoJoined] = useState(false);

    // ZegoCloud Project Credentials
    const APP_ID = 295688306; 
    const SERVER_SECRET = "44c980ceb6468fbd1978f45ed97e6a01"; 

    const handleCleanup = () => {
        if (zpRef.current) {
            try {
                console.log('[CallOverlay] Destroying Zego instance...');
                zpRef.current.destroy();
                zpRef.current = null;
            } catch (e) {
                console.warn('[CallOverlay] Cleanup failed:', e);
            }
        }
        setIsZegoJoined(false);
    };

    // Explicit cleanup on unmount
    useEffect(() => {
        return () => {
            handleCleanup();
        };
    }, []);

    // Cleanup when call status changes to ended
    useEffect(() => {
        if (activeCall?.status === 'ended' || !activeCall) {
            handleCleanup();
        }
    }, [activeCall?.status, activeCall]); // Added activeCall to dependency array

    useEffect(() => {
        if (activeCall?.status === 'active' && !isZegoJoined && videoContainerRef.current) {
            initZego();
        }
    }, [activeCall, isZegoJoined]);

    const initZego = async () => {
        try {
            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                APP_ID,
                SERVER_SECRET,
                activeCall.roomID,
                currentUser.uid,
                currentUser.displayName || "User"
            );

            const zp = ZegoUIKitPrebuilt.create(kitToken);
            zpRef.current = zp; // Store zp instance

            zp.joinRoom({
                container: videoContainerRef.current,
                sharedLinks: [],
                scenario: {
                    mode: activeCall.type === 'video' 
                        ? ZegoUIKitPrebuilt.ScenarioVideoConference 
                        : ZegoUIKitPrebuilt.ScenarioGroupCall,
                },
                showPreJoinView: false,
                onLeaveRoom: () => {
                    handleCleanup(); // Call cleanup on leave
                    endCall();
                }
            });
            setIsZegoJoined(true);
        } catch (error) {
            console.error('[CallOverlay] Zego initialization failed:', error);
            handleCleanup(); // Call cleanup on error
            endCall();
        }
    };

    if (!activeCall) return null;

    const isCaller = activeCall.callerId === currentUser?.uid;

    return (
        <motion.div
            key="call-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] bg-black/90 md:bg-bg-base/90 md:backdrop-blur-xl flex flex-col items-center justify-center p-4"
        >
            {/* 1. Ringing State (Outgoing/Incoming) */}
            {activeCall.status === 'ringing' && (
                <div className="text-center space-y-8 max-w-sm w-full bg-bg-surface/50 p-10 rounded-3xl border border-glass-border shadow-2xl">
                    <div className="relative mx-auto w-32 h-32">
                       <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 bg-primary-500/20 rounded-full"
                       />
                       <div className="relative bg-bg-surface rounded-full w-full h-full flex items-center justify-center text-4xl border-2 border-primary-500/30 overflow-hidden shadow-inner">
                         {activeCall.callerPhoto ? <img src={activeCall.callerPhoto} className="w-full h-full object-cover" /> : '👤'}
                       </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">
                            {isCaller ? `Calling ${activeCall.receiverName}...` : `Incoming ${activeCall.type} Call`}
                        </h2>
                        {!isCaller && <p className="text-text-muted font-medium">{activeCall.callerName} is calling you</p>}
                    </div>

                    <div className="flex items-center justify-center space-x-6">
                        {/* Decline/End Button */}
                        <button
                            onClick={endCall}
                            className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:scale-110 transition-all active:scale-95"
                        >
                            <FiX className="w-8 h-8" />
                        </button>

                        {/* Accept Button (Only for Receiver) */}
                        {!isCaller && (
                            <button
                                onClick={acceptCall}
                                className="p-5 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:scale-110 transition-all active:scale-95 animate-bounce"
                            >
                                {activeCall.type === 'video' ? <FiVideo className="w-8 h-8" /> : <FiPhone className="w-8 h-8" />}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 2. Active Call State (ZegoCloud Container) */}
            <div
                ref={videoContainerRef}
                className={`w-full h-full transition-opacity duration-500 ${activeCall.status === 'active' ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
            />

            {activeCall.status === 'active' && (
                 <button
                    onClick={endCall}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 p-4 rounded-full bg-red-500/30 hover:bg-red-500 backdrop-blur-md text-white border border-red-500/50 z-20 transition-all"
                    title="End Call"
                 >
                     <FiX className="w-6 h-6" />
                 </button>
            )}
        </motion.div>
    );
};

export default CallOverlay;
