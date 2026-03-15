import React from 'react';
import { motion } from 'framer-motion';

export const ChatListSkeleton = () => {
    return (
        <div className="space-y-4 p-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center space-x-3 opacity-50">
                    <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                        <div className="h-2 w-full bg-white/5 rounded animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const MessageSkeleton = () => {
    return (
        <div className="space-y-6 p-4 sm:p-6 h-full overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                        max-w-[75%] sm:max-w-[60%] h-12 rounded-2xl animate-pulse
                        ${i % 2 === 0 ? 'bg-primary-500/10 w-40 sm:w-48' : 'bg-white/5 w-52 sm:w-64'}
                    `} />
                </div>
            ))}
        </div>
    );
};

export const StatusSkeleton = () => {
    return (
        <div className="flex space-x-4 p-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 rounded-full border-2 border-white/5 bg-white/5 animate-pulse" />
                    <div className="h-2 w-12 bg-white/5 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
};
