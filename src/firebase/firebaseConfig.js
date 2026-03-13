import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  // NOTE: In a real app, these should be environment variables
  // e.g., import.meta.env.VITE_FIREBASE_API_KEY
  apiKey: "AIzaSyArE59VkQq9Q1r_HS_1L3D428saEie8Mhk",
  authDomain: "cwh-chat.firebaseapp.com",
  projectId: "cwh-chat",
  storageBucket: "cwh-chat.firebasestorage.app",
  messagingSenderId: "143905629802",
  appId: "1:143905629802:web:e4151f5e7ca2e1a3470c13",
  measurementId: "G-H786R6J62L"
};

import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);

// Initialize messaging conditionally
let messagingInstance = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      messagingInstance = getMessaging(app);
    }
  });
}

export const messaging = messagingInstance;
