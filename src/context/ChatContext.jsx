import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
  getDocs,
  writeBatch,
  limit,
  arrayUnion,
  arrayRemove,
  Timestamp,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  const [activeCall, setActiveCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const userCache = useRef({});

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

  // Subscribe to current user's profile (for dynamic status/avatar sync)
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserProfile(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        setCurrentUserProfile({ id: doc.id, ...doc.data() });
      }
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
        allChats.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) });
      });

      // Sort by updatedAt descending first to keep the newest one
      allChats.sort((a, b) => {
        const timeA = a.updatedAt?.toDate?.() || 0;
        const timeB = b.updatedAt?.toDate?.() || 0;
        return timeB - timeA;
      });

      allChats.forEach(chat => {
        // Soft Delete Filter: Skip if user has hidden this chat
        if (chat.hiddenBy?.includes(currentUser.uid)) return;

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
      
      // Keep activeChat in sync with raw data updates (admins, members, etc)
      setActiveChat(current => {
        if (!current) return null;
        const updated = chatsData.find(c => c.id === current.id);
        if (!updated) return current;
        // Merge preserved UI metadata (like otherUserId) with fresh Firestore data
        return { ...current, ...updated };
      });

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
        const data = doc.data();
        if (['ended', 'rejected', 'missed'].includes(data.status)) {
          // Clear after a delay to allow the overlay's exit animation to fire
          setTimeout(() => setActiveCall(null), 800);
        } else {
          setActiveCall({ id: doc.id, ...data });
        }
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
      limit(200) // Increase limit slightly for local sorting
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let history = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.callerId === currentUser.uid || data.receiverId === currentUser.uid) {
           history.push({ id: doc.id, ...data });
        }
      });

      // Sort locally by endedAt desc
      history.sort((a, b) => {
        const timeA = a.endedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.endedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });

      setCallHistory(history.slice(0, 50));
    }, (error) => {
        console.warn('[ChatContext] Call history subscription error:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to Statuses (24h)
  useEffect(() => {
    if (!currentUser) {
      setStatuses([]);
      return;
    }

    const startTime = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const q = query(
      collection(db, 'statuses'),
      where('createdAt', '>', startTime),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statusesByUser = {};
      snapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (!statusesByUser[data.userId]) {
          statusesByUser[data.userId] = {
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            stories: []
          };
        }
        statusesByUser[data.userId].stories.push(data);
      });

      // Sort: Current user first, then by newest stories
      const sortedStatuses = Object.values(statusesByUser).sort((a, b) => {
        if (a.userId === currentUser.uid) return -1;
        if (b.userId === currentUser.uid) return 1;
        const newestA = a.stories[0]?.createdAt?.toDate?.() || 0;
        const newestB = b.stories[0]?.createdAt?.toDate?.() || 0;
        return newestB - newestA;
      });

      setStatuses(sortedStatuses);

      // Keep activeStatus in sync as well
      setActiveStatus(current => {
        if (!current) return null;
        // Search all users' statuses to find the updated one
        for (const userStat of sortedStatuses) {
           if (userStat.userId === current.userId) {
              return userStat;
           }
        }
        return current;
      });
    }, (err) => {
      console.warn('[ChatContext] Status subscription error:', err);
    });

    return unsubscribe;
  }, [currentUser]);

  const toggleBlockUser = async (targetUserId) => {
    if (!currentUser) return;
    try {
      const isBlocked = currentUserProfile?.blockedUsers?.includes(targetUserId);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blockedUsers: isBlocked ? arrayRemove(targetUserId) : arrayUnion(targetUserId)
      });
      
      showPopup({
        title: isBlocked ? 'User Unblocked' : 'User Blocked',
        message: isBlocked ? 'You can now exchange messages and calls again.' : 'You will no longer receive messages or calls from this user.',
        type: 'info'
      });
    } catch (e) {
      console.error('[ChatContext] Toggle block failed:', e);
      showPopup({ title: 'Error', message: 'Failed to update block status.', type: 'error' });
    }
  };

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

  const clearChatMessages = async (chatId) => {
    if (!currentUser) return;
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Update last message to reflect cleared state
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: '',
        updatedAt: serverTimestamp()
      });

      console.log(`[ChatContext] Chat history cleared: ${chatId}`);
    } catch (e) {
      console.error('[ChatContext] Clear chat failed:', e);
      throw e;
    }
  };

  const sendMessage = async (chatId, text, file = null, replyData = null) => {
    if (!text.trim() && !file) return;

    // Block Check
    const otherMember = activeChat?.members?.find(m => m !== currentUser.uid);
    if (!activeChat?.isGroup && otherMember) {
      const otherUserDoc = users.find(u => u.id === otherMember);
      if (currentUserProfile?.blockedUsers?.includes(otherMember) || otherUserDoc?.blockedUsers?.includes(currentUser.uid)) {
        showPopup({ title: 'Message Not Sent', message: 'You cannot send messages to a blocked contact.', type: 'error' });
        return;
      }
    }

    try {
      let fileUrl = null;
      let fileType = null;
      let fileName = null;

      if (file) {
        const { uploadMedia } = await import('../utils/mediaService');
        fileUrl = await uploadMedia(file);
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('audio/')) {
          fileType = 'audio';
        } else {
          fileType = 'file';
        }
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
        hiddenBy: [] // Resurrection: Clear hiddenBy when new message arrives
      };

      // Find the chat to get its members
      const targetChat = chats.find(c => c.id === chatId) || activeChat;
      if (targetChat && targetChat.members) {
        targetChat.members.forEach(memberId => {
          if (memberId !== currentUser.uid) {
            updates[`unreadCount.${memberId}`] = increment(1);
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

    // Block Check
    const receiverDoc = users.find(u => u.id === receiverId);
    if (currentUserProfile?.blockedUsers?.includes(receiverId) || receiverDoc?.blockedUsers?.includes(currentUser.uid)) {
      showPopup({ title: 'Call Failed', message: 'You cannot call a blocked contact.', type: 'error' });
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

      // Automatically log the call in the direct message chat
      let targetChatId = activeChat?.id;
      if (!targetChatId || activeChat.isGroup || !activeChat.members?.includes(receiverId)) {
        const existingChat = chats.find(c => !c.isGroup && c.members.includes(receiverId));
        if (existingChat) targetChatId = existingChat.id;
      }

      if (targetChatId) {
        await addDoc(collection(db, 'chats', targetChatId, 'messages'), {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'User',
          senderAvatar: currentUser.photoURL || '',
          text: `${type === 'video' ? 'Video' : 'Voice'} call started`,
          mediaType: 'call_log',
          read: false,
          timestamp: serverTimestamp(),
        });
        
        await updateDoc(doc(db, 'chats', targetChatId), {
           lastMessage: `${type === 'video' ? 'Video' : 'Voice'} call`,
           updatedAt: serverTimestamp(),
           [`unreadCount.${receiverId}`]: increment(1)
        });
      }
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
      const callId = activeCall.id;
      const endedAt = new Date();
      
      // Update DB
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
      
      // Clear local state after a short delay to let animations finish
      setTimeout(() => setActiveCall(null), 500);
      
      // Proactively update call history locally for high-speed feel
      const completedCall = { 
        ...activeCall, 
        status: 'ended', 
        endedAt: { toDate: () => endedAt } // Mock Firestore timestamp for local UI
      };
      
      setCallHistory(prev => {
        // Only add if not already present (listener might have fired)
        if (prev.find(c => c.id === completedCall.id)) return prev;
        return [completedCall, ...prev].slice(0, 50);
      });

      // Automatically log the call end in the direct message chat
      try {
        let durationStr = 'Missed';
        if (activeCall.status === 'active' && activeCall.createdAt) {
          const startMs = activeCall.createdAt.toDate?.()?.getTime() || Date.now();
          const diffSec = Math.floor((endedAt.getTime() - startMs) / 1000);
          const m = Math.floor(diffSec / 60);
          const s = diffSec % 60;
          durationStr = `${m}:${s.toString().padStart(2, '0')} min`;
        }

        const otherUserId = activeCall.callerId === currentUser.uid ? activeCall.receiverId : activeCall.callerId;
        
        let targetChatId = activeChat?.id;
        if (!targetChatId || activeChat?.isGroup || !activeChat?.members?.includes(otherUserId)) {
          const existingChat = chats.find(c => !c.isGroup && c.members.includes(otherUserId));
          if (existingChat) targetChatId = existingChat.id;
        }

        if (targetChatId) {
          let callMsgText = `${activeCall.type === 'video' ? 'Video' : 'Voice'} call ended`;
          if (durationStr === 'Missed') {
             callMsgText = `Missed ${activeCall.type === 'video' ? 'video' : 'voice'} call`;
          } else {
             callMsgText += ` (${durationStr})`;
          }

          await addDoc(collection(db, 'chats', targetChatId, 'messages'), {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'User',
            senderAvatar: currentUser.photoURL || '',
            text: callMsgText,
            mediaType: 'call_log',
            read: false,
            timestamp: serverTimestamp(),
          });
          
          await updateDoc(doc(db, 'chats', targetChatId), {
             lastMessage: callMsgText,
             updatedAt: serverTimestamp(),
             [`unreadCount.${otherUserId}`]: increment(1)
          });
        }
      } catch (logErr) {
        console.warn('Failed to log call end to chat:', logErr);
      }

      setActiveCall(null);
    } catch (e) { console.error('[ChatContext] End failed:', e); }
  };

  const postStatus = async (statusData) => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'statuses'), {
        ...statusData,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userAvatar: currentUser.photoURL || '',
        createdAt: serverTimestamp(),
        viewers: []
      });
      return docRef.id;
    } catch (e) {
      console.error('[ChatContext] Post status failed:', e);
      throw e;
    }
  };

  const viewStatus = async (statusId) => {
    if (!currentUser) return;
    try {
      // Find the status to check if already viewed
      const currentStatus = statuses.flatMap(s => s.stories).find(story => story.id === statusId);
      const isAlreadyViewed = currentStatus?.viewers?.some(v => typeof v === 'string' ? v === currentUser.uid : v.uid === currentUser.uid);

      if (isAlreadyViewed) return; // Don't add duplicate views

      await updateDoc(doc(db, 'statuses', statusId), {
        viewers: arrayUnion({ uid: currentUser.uid, viewedAt: Date.now() })
      });
    } catch (e) {
      console.warn('[ChatContext] View status update failed:', e);
    }
  };

  const updateChatWallpaper = async (chatId, wallpaperUrl) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`wallpapers.${currentUser.uid}`]: wallpaperUrl
      });
    } catch (e) {
      console.error('[ChatContext] Update wallpaper failed:', e);
    }
  };

  const deleteStatus = async (statusId) => {
    try {
      await deleteDoc(doc(db, 'statuses', statusId));
    } catch (e) {
      console.error('[ChatContext] Delete status failed:', e);
    }
  };

  const togglePinChat = async (chatId) => {
    if (!currentUser) return;
    try {
      const chat = chats.find(c => c.id === chatId);
      const isPinned = chat?.pinnedBy?.includes(currentUser.uid);
      await updateDoc(doc(db, 'chats', chatId), {
        pinnedBy: isPinned ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
    } catch (e) {
      console.error('[ChatContext] Toggle pin failed:', e);
    }
  };

  const toggleMuteChat = async (chatId) => {
    if (!currentUser) return;
    try {
      const chat = chats.find(c => c.id === chatId);
      const isMuted = chat?.mutedBy?.includes(currentUser.uid);
      await updateDoc(doc(db, 'chats', chatId), {
        mutedBy: isMuted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
    } catch (e) {
      console.error('[ChatContext] Toggle mute failed:', e);
    }
  };

  const deleteChat = async (targetId) => {
    if (!currentUser) return;
    try {
      // Find the actual chat document ID. 
      // It might be a direct Chat ID, or a User ID passed from the sidebar.
      let actualChatId = targetId;
      const existingChat = chats.find(c => 
        c.id === targetId || (!c.isGroup && c.members.includes(targetId))
      );

      if (existingChat) {
        actualChatId = existingChat.id;
      } else {
        // If no chat exists yet, nothing to delete
        return;
      }

      if (activeChat?.id === actualChatId) setActiveChat(null);
      
      // Soft Delete: Just hide for this user
      await updateDoc(doc(db, 'chats', actualChatId), {
        hiddenBy: arrayUnion(currentUser.uid)
      });
      console.log(`[ChatContext] Chat hidden for user: ${actualChatId}`);
    } catch (e) {
      console.error('[ChatContext] Delete chat failed:', e);
      showPopup({
        title: 'Delete Failed',
        message: 'You may not have permission to delete this chat.',
        type: 'error'
      });
      throw e;
    }
  };

  const deleteCall = async (callId) => {
    try {
      await deleteDoc(doc(db, 'calls', callId));
      setCallHistory(prev => prev.filter(c => c.id !== callId));
      console.log(`[ChatContext] Call deleted: ${callId}`);
    } catch (e) {
      console.error('[ChatContext] Delete call failed:', e);
      showPopup({
        title: 'Error',
        message: 'Failed to remove the call record.',
        type: 'error'
      });
    }
  };

  const toggleStarMessage = async (chatId, messageId, currentlyStarred) => {
    if (!currentUser) return;
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        starredBy: currentlyStarred ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
    } catch (e) {
      console.error('[ChatContext] Toggle star failed:', e);
    }
  };

  const forwardMessage = async (message, targetChatId) => {
    if (!currentUser || !targetChatId) return;
    try {
      const forwardData = {
        text: message.text || '',
        mediaUrl: message.mediaUrl || null,
        mediaType: message.mediaType || null,
        fileName: message.fileName || null,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        senderAvatar: currentUser.photoURL || '',
        timestamp: serverTimestamp(),
        isForwarded: true,
        starredBy: []
      };

      await addDoc(collection(db, 'chats', targetChatId, 'messages'), forwardData);
      
      const targetChat = chats.find(c => c.id === targetChatId) || activeChat;
      const updates = {
        lastMessage: message.mediaUrl ? (message.mediaType?.includes('image') ? '📷 Photo' : '📁 File') : message.text,
        updatedAt: serverTimestamp(),
        hiddenBy: [] // Resurrect on forward
      };

      if (targetChat && targetChat.members) {
        targetChat.members.forEach(memberId => {
          if (memberId !== currentUser.uid) {
            updates[`unreadCount.${memberId}`] = increment(1);
          }
        });
      }

      await updateDoc(doc(db, 'chats', targetChatId), updates);
    } catch (e) {
      console.error('[ChatContext] Forward failed:', e);
      throw e;
    }
  };

  const clearCallHistory = async () => {
    if (!currentUser) return;
    try {
      const promises = callHistory.map(call => deleteDoc(doc(db, 'calls', call.id)));
      await Promise.all(promises);
      setCallHistory([]);
      console.log(`[ChatContext] Call history cleared (${callHistory.length} items)`);
      showPopup({
        title: 'History Cleared',
        message: 'Your call history has been wiped clean.',
        type: 'info'
      });
    } catch (e) {
      console.error('[ChatContext] Clear call history failed:', e);
      showPopup({
        title: 'Clear Failed',
        message: 'Failed to clear some calls from history.',
        type: 'error'
      });
    }
  };

  const showPopup = ({ title, message, type = 'info', onConfirm = null }) => {
    setPopup({ show: true, title, message, type, onConfirm });
  };

  const closePopup = () => {
    setPopup(prev => ({ ...prev, show: false }));
  };

  const value = useMemo(() => ({
    currentUserProfile,
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
    callHistory,
    statuses,
    activeStatus,
    setActiveStatus,
    postStatus,
    viewStatus,
    deleteStatus,
    deleteChat,
    clearChatMessages,
    deleteCall,
    clearCallHistory,
    togglePinChat,
    toggleMuteChat,
    toggleStarMessage,
    toggleBlockUser,
    forwardMessage,
    updateChatWallpaper,
    popup,
    showPopup,
    showToast,
    closePopup
  }), [
    currentUserProfile, users, chats, activeChat, typingUsers, replyTo, loading, 
    activeCall, callHistory, statuses, activeStatus, popup, showToast
  ]);

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
