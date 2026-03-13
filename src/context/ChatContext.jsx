import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, storage } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  setDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);

  // Subscribe to all users (for creating new chats)
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }

    console.log('[ChatContext] Version 1.2 Loaded');
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = [];
      snapshot.forEach((doc) => {
        if (doc.id !== currentUser.uid) {
          usersData.push({ id: doc.id, ...doc.data() });
        }
      });
      setUsers(usersData);
    }, (error) => {
      console.error('[ChatContext] Users subscription failed:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to user's chats
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = [];
      const seenMembers = new Set();
      
      const allChats = [];
      snapshot.forEach((doc) => {
        allChats.push({ id: doc.id, ...doc.data() });
      });

      // Sort by updatedAt descending first to keep the newest one
      allChats.sort((a, b) => {
        const timeA = a.updatedAt?.toDate?.() || 0;
        const timeB = b.updatedAt?.toDate?.() || 0;
        return timeB - timeA;
      });

      allChats.forEach(chat => {
        if (!chat.isGroup) {
          const membersKey = chat.members.sort().join('_');
          if (!seenMembers.has(membersKey)) {
            seenMembers.add(membersKey);
            chatsData.push(chat);
          }
        } else {
          chatsData.push(chat); // Always show unique groups
        }
      });

      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      console.error('[ChatContext] Chats subscription failed:', error);
      setLoading(false); // Don't block UI on error
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to Incoming Calls logic
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.uid),
      where('status', 'in', ['ringing', 'active'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // If there's at least one active call involving us
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setActiveCall(callData);
      } else {
        // Only clear if we were previously in a call
        setActiveCall(curr => (curr?.receiverId === currentUser.uid ? null : curr));
      }
    });

    return unsubscribe;
  }, [currentUser]);

  // Also listen to the call we started (if any) to see if recipient accepted/ended
  useEffect(() => {
    if (!currentUser || !activeCall || activeCall.receiverId === currentUser.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (doc) => {
      if (doc.exists()) {
        setActiveCall({ id: doc.id, ...doc.data() });
      } else {
        setActiveCall(null);
      }
    });

    return unsubscribe;
  }, [currentUser, activeCall?.id]);

  // Subscribe to Call History
  useEffect(() => {
    if (!currentUser) {
      setCallHistory([]);
      return;
    }

    // Logic: Calls where I am caller or receiver and status is ended
    const q = query(
      collection(db, 'calls'),
      where('status', '==', 'ended'),
      orderBy('endedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.callerId === currentUser.uid || data.receiverId === currentUser.uid) {
           history.push({ id: doc.id, ...data });
        }
      });
      setCallHistory(history);
    }, (error) => {
        console.warn('[ChatContext] Call history subscription error:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  const startDirectMessage = async (otherUser) => {
    // Check if chat already exists locally
    const existingChat = chats.find(chat => 
      !chat.isGroup && chat.members.includes(otherUser.id)
    );

    if (existingChat) {
        setActiveChat({
            ...existingChat,
            name: otherUser.name,
            avatar: otherUser.avatar,
             online: otherUser.online,
             otherUserId: otherUser.id
        });
        return existingChat.id;
    }

    // Create new chat document
    const chatDoc = {
      members: [currentUser.uid, otherUser.id],
      isGroup: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: ''
    };

    const newChatRef = await addDoc(collection(db, 'chats'), chatDoc);
    
    // Set as active immediately with temporary metadata
    setActiveChat({
      id: newChatRef.id,
      ...chatDoc,
      name: otherUser.name,
      avatar: otherUser.avatar,
      online: otherUser.online,
      otherUserId: otherUser.id
    });

    return newChatRef.id;
  };

  const sendMessage = async (chatId, text, file = null, replyData = null) => {
    if (!text.trim() && !file) return;

    try {
      let fileUrl = null;
      let fileType = null;
      let fileName = null;

      if (file) {
        const { uploadMedia } = await import('../utils/mediaService');
        fileUrl = await uploadMedia(file);
        fileType = file.type.startsWith('image/') ? 'image' : 'file';
        fileName = file.name;
      }

      const msgData = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        senderAvatar: currentUser.photoURL || '',
        text,
        mediaUrl: fileUrl,
        mediaType: fileType,
        fileName,
        read: false,
        timestamp: serverTimestamp(),
      };

      if (replyData) {
        msgData.replyTo = {
            id: replyData.id,
            text: replyData.text,
            senderName: replyData.senderName,
            mediaUrl: replyData.mediaUrl || null
        };
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);
      setReplyTo(null);

      // Update chat meta & increment unread for other members
      const chatRef = doc(db, 'chats', chatId);
      const updates = {
        lastMessage: text || (fileType === 'image' ? '📸 Image' : '📎 File'),
        updatedAt: serverTimestamp(),
      };

      // In a real app we'd use a server-side increment for each member. 
      // For this MVP, we'll try to update the unread flags.
      // We'll fetch the chat members to know who to increment for.
      if (activeChat?.members) {
          activeChat.members.forEach(uid => {
              if (uid !== currentUser.uid) {
                  updates[`unreadCount.${uid}`] = (activeChat.unreadCount?.[uid] || 0) + 1;
              }
          });
      }

      await updateDoc(chatRef, updates);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const [typingUsers, setTypingUsers] = useState({});

  // Subscribe to typing indicators
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'typing'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typing = {};
      const now = Date.now();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.()?.getTime() || 0;
        
        // Only show fresh indicators (last 10 seconds) and ignore current user
        if (data.userId !== currentUser.uid && (now - timestamp) < 10000) {
            // Deduplicate by userId inside the chat
            const key = `${data.chatId}_${data.userId}`;
            if (!typing[key] || typing[key].timestamp < timestamp) {
              typing[key] = data;
            }
        }
      });
      setTypingUsers(typing);
    });
    return unsubscribe;
  }, [currentUser]);

  const setTyping = async (chatId, isTyping) => {
    if (!currentUser) return;
    const typingId = `${chatId}_${currentUser.uid}`;
    try {
      if (isTyping) {
        await setDoc(doc(db, 'typing', typingId), {
            chatId,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'User',
            timestamp: serverTimestamp()
        });
      } else {
        const { deleteDoc, doc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'typing', typingId));
      }
    } catch (e) {
      console.warn('Typing update failed:', e);
    }
  };

  const syncProfile = async () => {
    if (!currentUser) return;
    try {
        const userDoc = {
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || 'User',
            avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'U')}&background=4f46e5&color=fff`,
            online: true,
            lastSeen: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', currentUser.uid), userDoc, { merge: true });
        console.log(`[ManualSync] Profile synced successfully!`, userDoc);
        alert('Profile synced successfully! You are now discoverable.');
    } catch (error) {
        console.error(`[ManualSync] Failed to sync profile:`, error);
        alert('Failed to sync profile. Check console for details.');
    }
  };

  const startCall = async (receiverId, receiverName, type = 'video') => {
    if (!currentUser || !receiverId) {
      console.warn('[ChatContext] Cannot start call: No receiverId provided');
      return;
    }

    const roomID = `room_${Date.now()}_${currentUser.uid.slice(0, 5)}`;
    const callData = {
      callerId: currentUser.uid,
      callerName: currentUser.displayName || 'User',
      callerPhoto: currentUser.photoURL || '',
      receiverId,
      receiverName,
      type,
      status: 'ringing',
      roomID,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'calls'), callData);
      setActiveCall({ id: docRef.id, ...callData });
    } catch (e) {
      console.error('[ChatContext] Failed to start call:', e);
    }
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    try {
      await updateDoc(doc(db, 'calls', activeCall.id), {
        status: 'active'
      });
    } catch (e) { console.error('[ChatContext] Accept failed:', e); }
  };

  const endCall = async () => {
    if (!activeCall) return;
    try {
      await updateDoc(doc(db, 'calls', activeCall.id), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
      setActiveCall(null);
    } catch (e) { console.error('[ChatContext] End failed:', e); }
  };

  const value = {
    users,
    chats,
    activeChat,
    setActiveChat,
    startDirectMessage,
    sendMessage,
    typingUsers,
    setTyping,
    replyTo,
    setReplyTo,
    loading,
    syncProfile,
    activeCall,
    startCall,
    acceptCall,
    endCall,
    callHistory
  };

  // Update document title with total unread count
  useEffect(() => {
    if (!currentUser) {
        document.title = 'CWH Chat';
        return;
    }
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount?.[currentUser.uid] || 0), 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) CWH Chat` : 'CWH Chat';
  }, [chats, currentUser]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
