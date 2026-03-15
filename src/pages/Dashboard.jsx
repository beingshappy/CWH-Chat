import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import InfoPanel from '../components/InfoPanel';
import StatusViewer from '../components/StatusViewer';
import { FiMenu } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { AnimatePresence, motion } from 'framer-motion';

const Dashboard = () => {
  const [showInfo, setShowInfo] = useState(false);
  const { activeChat, activeStatus, setActiveStatus } = useChat();

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden relative">
      {/* Background is handled globally by BackgroundEffects component */}

      <div className="flex w-full h-full z-10 relative overflow-hidden">
        {/* Sidebar */}
        <motion.div 
          initial={false}
          animate={{ width: (activeChat || activeStatus) ? (window.innerWidth >= 768 ? (window.innerWidth >= 1024 ? 384 : 320) : 0) : '100%' }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className={`
            flex-shrink-0 border-r border-glass-border glass-dark z-30 overflow-hidden
            ${(activeChat || activeStatus) ? 'hidden md:flex' : 'flex'} 
            md:w-80 lg:w-96
          `}
        >
          <div className="w-full md:w-80 lg:w-96 h-full">
            <Sidebar />
          </div>
        </motion.div>
        
        {/* Main Content */}
        <main className={`
          flex-1 flex flex-col relative h-full min-w-0 min-h-0 z-20 overflow-hidden
          ${(!activeChat && !activeStatus) ? 'hidden md:flex' : 'flex'}
        `}>
          <AnimatePresence mode="wait" initial={false}>
            {activeChat ? (
              <motion.div
                key={`chat-${activeChat.id}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 flex flex-col min-h-0"
              >
                <ChatWindow
                  activeChat={activeChat}
                  toggleInfo={() => {
                    setShowInfo(!showInfo);
                  }}
                />
              </motion.div>
            ) : activeStatus ? (
              <motion.div
                key={`status-${activeStatus.userId}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 flex flex-col min-h-0"
              >
                <StatusViewer
                  userStatus={activeStatus}
                  onClose={() => setActiveStatus(null)}
                  isPane={true}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1 flex flex-col justify-center items-center bg-sidebar-premium px-6 overflow-hidden"
              />
            )}
          </AnimatePresence>
        </main>

        {/* Info Panel Container (Smooth Layout Transition on Desktop) */}
        <AnimatePresence>
          {showInfo && activeChat && (
            <motion.div
              key="info-panel-desktop"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }} // lg:w-80 is 320px
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="hidden lg:block h-full border-l border-glass-border overflow-hidden"
            >
              <div className="w-80 h-full"> {/* Stable width inner container */}
                <InfoPanel 
                  activeChat={activeChat} 
                  close={() => setShowInfo(false)} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Panel (Mobile Overlay) */}
        <AnimatePresence>
          {showInfo && activeChat && (
            <motion.div
              key="info-panel-mobile"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="lg:hidden fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowInfo(false)}
            >
              <div 
                className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <InfoPanel 
                  activeChat={activeChat} 
                  close={() => setShowInfo(false)} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;

