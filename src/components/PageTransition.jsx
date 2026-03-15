import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition wraps page-level content with Framer Motion
 * fade + slight upward slide for premium app-like feel.
 */
const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        style={{ height: '100%', width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
