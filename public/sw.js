importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'wednak2026',
  appId: '1:422916996832:web:4fdb50b797e2b9abb91a85',
  apiKey: 'AIzaSyCo0uQcxD8KFmsn09A3SpWHY5gmk-mN_dU',
  authDomain: 'wednak2026.firebaseapp.com',
  storageBucket: 'wednak2026.firebasestorage.app',
  messagingSenderId: '422916996832',
  measurementId: 'G-G97TNLL69Q',
});

const messaging = firebase.messaging();
const CACHE_NAME = 'wedding-shell-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/wednak-mark-green.svg'];

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'ويدنك';
  const options = {
    body: data.body || 'لديك تحديث جديد',
    icon: '/wednak-mark-green.svg',
    badge: '/wednak-mark-green.svg',
    tag: data.notificationId || data.bookingId || 'wednak-update',
    renotify: true,
    data: { url: data.url || '/?tab=notifications' },
    dir: 'rtl',
    lang: 'ar',
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/?tab=notifications', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && ['script', 'style', 'image', 'font'].includes(request.destination)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
