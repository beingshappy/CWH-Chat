import { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

const NotificationManager = () => {
  const { chats, activeCall } = useChat();
  const { currentUser } = useAuth();
  const prevUnreadRef = useRef({});

  // Request Notification Permissions politely on dashboard mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // In a PWA context, asking for permission on dashboard load is common
      Notification.requestPermission().catch(e => console.warn('Notification permission error:', e));
    }
  }, []);

  // Handle Incoming Call Foreground Notifications
  useEffect(() => {
    if (activeCall && activeCall.status === 'ringing' && activeCall.callerId !== currentUser?.uid) {
      if ('Notification' in window && Notification.permission === 'granted') {
          try {
             // Only fire if the document is hidden/backgrounded to prevent double-annoyance,
             // or fire always if the user might be looking at a different tab.
             const n = new Notification(`Incoming ${activeCall.type} call`, {
               body: `${activeCall.callerName} is calling you...`,
               icon: activeCall.callerPhoto || '/icon-192x192.png',
               tag: 'incoming_call_' + activeCall.id,
               requireInteraction: true,
               vibrate: [200, 100, 200, 100, 200, 100, 200]
             });
             n.onclick = () => window.focus();
             
             // Optional: Close the notification automatically if the call ends
             const checkEnd = setInterval(() => {
                 if (!activeCall || activeCall.status !== 'ringing') {
                     n.close();
                     clearInterval(checkEnd);
                 }
             }, 1000);
          } catch (e) {
             console.warn('Call Notification failed:', e);
          }
      }
    }
  }, [activeCall?.id, activeCall?.status, activeCall?.callerId, currentUser?.uid]);

  // Handle New Message Foreground Notifications
  useEffect(() => {
    if (!currentUser || !chats) return;

    chats.forEach(chat => {
      const currentUnread = chat.unreadCount?.[currentUser.uid] || 0;
      const prevUnread = prevUnreadRef.current[chat.id] || 0;

      // If our unread count went up, it means a new message arrived that we haven't seen yet!
      if (currentUnread > prevUnread && currentUnread > 0) {
         if ('Notification' in window && Notification.permission === 'granted') {
             // Only notify if we are NOT currently looking at this exact chat
             // (If the document is hidden, always notify)
             if (document.hidden) {
                 try {
                   const n = new Notification(`New message from ${chat.name || 'Someone'}`, {
                     body: chat.lastMessage || 'You have a new message',
                     icon: chat.photo || '/icon-192x192.png',
                     tag: `chat_${chat.id}`,
                   });
                   n.onclick = () => {
                       window.focus();
                       n.close();
                   };
                 } catch(e) {
                     console.warn('Message Notification failed:', e);
                 }
             }
         }
      }
      
      // Update ref to track future changes
      prevUnreadRef.current[chat.id] = currentUnread;
    });
  }, [chats, currentUser]);

  return null; // This is a logic-only component rendering nothing to the screen
};

export default NotificationManager;
