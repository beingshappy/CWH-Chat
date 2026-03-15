import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const BackgroundEffects = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-bg-base"
      style={{ background: !isLight ? 'var(--bg-gradient)' : 'var(--bg-base)' }}
    >
      {/* WhatsApp-style Doodles Overlay - Crisp & Visible */}
      <div className={`absolute inset-0 bg-doodles ${isLight ? 'opacity-[0.05]' : 'opacity-[0.08]'} z-0`} />

      {/* Subtle Primary Glow */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: isLight ? [0.03, 0.06, 0.03] : [0.1, 0.2, 0.1],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[100px]"
      />

      {/* Subtle Secondary Glow */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: isLight ? [0.02, 0.05, 0.02] : [0.08, 0.15, 0.08],
          x: [0, -40, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]"
      />

      {/* Sparse Particles for Performance */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: Math.random() * 100 + '%', y: Math.random() * 100 + '%' }}
          animate={{
            y: ['-10%', '110%'],
            opacity: isLight ? [0, 0.08, 0] : [0, 0.2, 0],
          }}
          transition={{
            duration: Math.random() * 20 + 20,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
          className="absolute w-px h-[80px] bg-gradient-to-b from-transparent via-primary-500/10 to-transparent"
        />
      ))}

      {/* Grid Pattern Mesh */}
      <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] ${isLight ? 'opacity-[0.008]' : 'opacity-[0.015]'} mix-blend-overlay`} />
    </div>
  );
};

export default BackgroundEffects;
