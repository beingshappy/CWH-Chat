import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiSend } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(messages[err.code] || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 relative overflow-y-auto bg-bg-base scrollbar-hide">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/20 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-600/20 blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-card rounded-2xl p-6 sm:p-10 z-10 my-auto shadow-2xl border border-white/10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
            <FiMail className="w-7 h-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400 text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-semibold mb-2">Email Sent!</h2>
            <p className="text-slate-400 text-sm mb-6">
              Check your inbox at <span className="text-primary-400 font-medium">{email}</span> for the reset link.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-primary-400 hover:text-primary-300 transition-colors text-sm font-medium"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiMail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  aria-label="Email address"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
