import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import InfoPanel from '../components/InfoPanel';
import { FiMenu } from 'react-icons/fi';
import { useChat } from '../context/ChatContext';
import { AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [showInfo, setShowInfo] = useState(false);
  const { activeChat } = useChat();

  return (
    <div className="h-screen w-full flex bg-bg-base overflow-hidden relative">
      {/* Global Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-[128px]" />
      </div>
      <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-[2px] z-0 pointer-events-none" />

      <div className="flex w-full h-full z-10 relative overflow-hidden">
        {/* Sidebar */}
        <div className={`
          flex-shrink-0 transition-all duration-300 ease-in-out border-r border-glass-border glass-dark z-30
          ${activeChat ? 'hidden md:flex' : 'flex'} 
          w-full md:w-80 lg:w-96
        `}>
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <main className={`
          flex-1 flex flex-col relative h-full min-w-0 min-h-0 transition-all duration-300 z-20
          ${!activeChat ? 'hidden md:flex' : 'flex'}
        `}>
          {activeChat ? (
            <ChatWindow
              activeChat={activeChat}
              toggleInfo={() => {
                console.log('[Dashboard] Toggling Info Panel:', !showInfo);
                setShowInfo(!showInfo);
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 bg-slate-900/10 backdrop-blur-sm shadow-inner px-6">
              <div className="w-24 h-24 mb-6 rounded-full bg-slate-800/40 flex items-center justify-center glass border border-white/5 shadow-2xl">
                <svg className="w-12 h-12 text-primary-400 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extralight text-slate-300 tracking-tight mb-2">CWH Chat Premium</h2>
              <p className="max-w-[280px] text-center text-xs opacity-60 leading-relaxed">Select a conversation to start messaging in high fidelity.</p>
            </div>
          )}
        </main>

        {/* Info Panel */}
        <AnimatePresence mode="wait">
          {showInfo && activeChat && (
            <InfoPanel 
              key={activeChat.id}
              activeChat={activeChat} 
              close={() => setShowInfo(false)} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;

