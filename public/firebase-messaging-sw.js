importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// NOTE: Replace with your real Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyArE59VkQq9Q1r_HS_1L3D428saEie8Mhk",
  authDomain: "cwh-chat.firebaseapp.com",
  projectId: "cwh-chat",
  storageBucket: "cwh-chat.firebasestorage.app",
  messagingSenderId: "143905629802",
  appId: "1:143905629802:web:e4151f5e7ca2e1a3470c13"
});

const messaging = firebase.messaging();

// Background message handler — shows notification when app is not in foreground
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || 'CWH Chat', {
    body: body || 'You have a new message.',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.collapseKey || 'cwh-chat-msg',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: payload.fcmOptions?.link || '/' },
  });
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
