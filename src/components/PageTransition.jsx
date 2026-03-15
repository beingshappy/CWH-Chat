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
    <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ height: '100%', width: '100%' }}
      >
        {children}
    </motion.div>
  );
};

export default PageTransition;
