import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign Up
  const signup = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Ensure we have a default profile image
      const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
      
      await updateProfile(userCredential.user, {
        displayName,
        photoURL
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Save user to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: displayName,
        email,
        avatar: photoURL,
        status: 'Hey there! I am using CWH Chat.',
        lastSeen: serverTimestamp(),
        online: true
      });

      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  // Sign In
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Ensure doc exists
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      email: result.user.email,
      online: true,
      lastSeen: serverTimestamp(),
    }, { merge: true });
    return result;
  };

  // Google Sign In
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Save/Update user in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        avatar: result.user.photoURL,
        status: 'Hey there! I am using CWH Chat.',
        lastSeen: serverTimestamp(),
        online: true
      }, { merge: true });

      return result;
    } catch (error) {
      throw error;
    }
  };

  // Sign Out
  const logout = async () => {
    try {
      if (currentUser) {
        // Set offline status - non-blocking
        setDoc(doc(db, 'users', currentUser.uid), {
          online: false,
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(err => console.warn('Offline status update failed:', err));
      }
    } finally {
      return signOut(auth);
    }
  };

  useEffect(() => {
    // Heartbeat logic holder
    let heartbeatInterval = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // Clear any existing heartbeat
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      if (user) {
        // Start Heartbeat
        heartbeatInterval = setInterval(async () => {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              lastSeen: serverTimestamp(),
              online: true
            });
          } catch (e) {
            console.warn('[Heartbeat] Failed:', e);
          }
        }, 30000); // 30 seconds

        // Update online status and sync profile info
        try {
          const userDoc = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'User',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=4f46e5&color=fff`,
            online: true,
            lastSeen: serverTimestamp(),
          };
          
          await setDoc(doc(db, 'users', user.uid), userDoc, { merge: true });
        } catch (error) {
          console.error(`[AuthSync] Failed to sync profile:`, error);
        }

        // Initialize FCM
        try {
           const { messaging } = await import('../firebase/firebaseConfig');
           if (messaging) {
              const { getToken } = await import('firebase/messaging');
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                const token = await getToken(messaging, { 
                  vapidKey: 'BPSMhTzVFOELKk0MEx6U0VlA4rKk3_GPE0hA9tpmAuZMmd_fvNSE70butVaYckPICyMcQbytQMICUj2XNXkloN4'
                });
                if (token) {
                   const { updateDoc, doc } = await import('firebase/firestore');
                   await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
                }
              }
           }
        } catch (err) {
            console.warn('FCM registration skipped or failed:', err);
        }
      }
    });

    // Mark offline on unload (Best effort)
    const handleUnload = () => {
      if (auth.currentUser) {
        setDoc(doc(db, 'users', auth.currentUser.uid), { 
          online: false, 
          lastSeen: serverTimestamp() 
        }, { merge: true }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
