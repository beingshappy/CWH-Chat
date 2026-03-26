import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PageTransition from './components/PageTransition';
import BackgroundEffects from './components/BackgroundEffects';
import CallOverlay from './components/CallOverlay';
import ModernPopup from './components/ModernPopup';
import NotificationProvider from './components/NotificationProvider';

import { AnimatePresence } from 'framer-motion';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// Define animating layout wrapper
const AnimatedRoutes = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={!currentUser ? <PageTransition><Login /></PageTransition> : <Navigate to="/" replace />} />
        <Route path="/register" element={!currentUser ? <PageTransition><Register /></PageTransition> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={!currentUser ? <PageTransition><ForgotPassword /></PageTransition> : <Navigate to="/" replace />} />
        <Route path="/" element={currentUser ? <PageTransition><Dashboard /></PageTransition> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={currentUser ? <PageTransition><Profile /></PageTransition> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={currentUser ? <PageTransition><Settings /></PageTransition> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const LoadingSpinner = () => (
  <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-bg-base relative overflow-hidden">
    <div className="relative">
      <div className="w-12 h-12 border-2 border-primary-500/20 rounded-full" />
      <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-primary-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
    </div>
    <p className="mt-4 text-[10px] font-semibold tracking-widest text-text-main/40 animate-pulse">Loading secured experience...</p>
  </div>
);

function App() {
  const { currentUser } = useAuth();

  return (
    <ThemeProvider>
      <Router>
        <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative font-sans">
          <BackgroundEffects />
          <NotificationProvider>
            <CallOverlay />
            <ModernPopup />
            <Suspense fallback={<LoadingSpinner />}>
              <AnimatedRoutes />
            </Suspense>
          </NotificationProvider>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

