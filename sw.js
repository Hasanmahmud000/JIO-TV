// sw.js - Service Worker for Background Notifications
const CACHE_NAME = 'cricstreamzone-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Background notification handling
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon } = event.data;
    
    self.registration.showNotification(title, {
      body: body,
      icon: icon || 'https://i.postimg.cc/3rPWWckN/icon-192.png',
      badge: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
      tag: 'cricket-match',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'view',
          title: 'Watch Now',
          icon: 'https://i.postimg.cc/3rPWWckN/icon-192.png'
        }
      ]
    });
  }
  
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app when notification is clicked
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for notifications (if supported)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Fetch latest matches and check for notifications
      fetch('https://script.google.com/macros/s/AKfycbxzx4xcwEGidoxEd7BQshkR9FKHjK5o0p8ukNY4NsKNR0EsShY7eV3MUxA2iXz1V8bmHg/exec')
        .then(response => response.json())
        .then(data => {
          // Process matches and send notifications if needed
          console.log('Background sync completed');
        })
        .catch(error => {
          console.error('Background sync failed:', error);
        })
    );
  }
});
