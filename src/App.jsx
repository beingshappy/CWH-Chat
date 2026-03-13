import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PageTransition from './components/PageTransition';
import BackgroundEffects from './components/BackgroundEffects';
import CallOverlay from './components/CallOverlay';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

const LoadingSpinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-bg-base">
    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { currentUser } = useAuth();

  return (
    <ThemeProvider>
      <Router>
        <div className="h-full w-full bg-bg-base text-text-main overflow-hidden relative font-sans">
          <BackgroundEffects />
          <CallOverlay />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={!currentUser ? <PageTransition><Login /></PageTransition> : <Navigate to="/" />} />
              <Route path="/register" element={!currentUser ? <PageTransition><Register /></PageTransition> : <Navigate to="/" />} />
              <Route path="/forgot-password" element={!currentUser ? <PageTransition><ForgotPassword /></PageTransition> : <Navigate to="/" />} />
              <Route path="/" element={currentUser ? <PageTransition><Dashboard /></PageTransition> : <Navigate to="/login" />} />
              <Route path="/profile" element={currentUser ? <PageTransition><Profile /></PageTransition> : <Navigate to="/login" />} />
              <Route path="/settings" element={currentUser ? <PageTransition><Settings /></PageTransition> : <Navigate to="/login" />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

