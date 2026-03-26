importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// ─── Firebase Initialization ──────────────────────────────────────────
// NOTE: Replaced with real Firebase config from the previous version
firebase.initializeApp({
  apiKey: "AIzaSyArE59VkQq9Q1r_HS_1L3D428saEie8Mhk",
  authDomain: "cwh-chat.firebaseapp.com",
  projectId: "cwh-chat",
  storageBucket: "cwh-chat.firebasestorage.app",
  messagingSenderId: "143905629802",
  appId: "1:143905629802:web:e4151f5e7ca2e1a3470c13"
});

const messaging = firebase.messaging();

// ─── Offline Caching (from service-worker.js) ────────────────────────
const CACHE_NAME = 'cwh-chat-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ─── Firebase Messaging Handlers ─────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received (Payload):', JSON.stringify(payload));
  const { title, body, icon } = payload.notification || {};

  const notificationOptions = {
    body: body || 'You have a new message.',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.collapseKey || 'cwh-chat-msg',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: payload.fcmOptions?.link || '/' },
  };

  console.log('[SW] Showing notification with options:', JSON.stringify(notificationOptions));
  
  return self.registration.showNotification(title || 'CWH Chat', notificationOptions);
});

// ─── Notification Click Handler ──────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification Clicked:', event.notification.tag);
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      console.log('[SW] Matching clients for focus/open:', windowClients.length);
      // Try to find an existing window and focus it
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          console.log('[SW] Found existing client, focusing...');
          return client.focus();
        }
      }
      // If no window found, open a new one
      if (clients.openWindow) {
        console.log('[SW] No existing client found, opening new window...');
        return clients.openWindow(url);
      }
    })
  );
});
