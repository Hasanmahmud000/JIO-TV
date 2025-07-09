// sw.js
const CACHE_NAME = 'cricstreamzone-v1.0.5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
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
    }).then(() => self.clients.claim())
  );
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
      })
  );
});

// 🔔 NOTIFICATION SYSTEM
let notificationTimers = new Map();
let matches = [];

// Listen for match data updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_MATCHES') {
    matches = event.data.matches;
    scheduleNotifications();
  }
});

// Schedule notifications for all matches
function scheduleNotifications() {
  // Clear existing timers
  notificationTimers.forEach(timer => clearTimeout(timer));
  notificationTimers.clear();

  const now = new Date();

  matches.forEach(match => {
    const matchTime = new Date(match.MatchTime);
    const time15Min = new Date(matchTime.getTime() - 15 * 60 * 1000);
    const time5Min = new Date(matchTime.getTime() - 5 * 60 * 1000);

    // 15 minutes before notification
    if (time15Min > now) {
      const timeout15 = setTimeout(() => {
        showNotification({
          title: '🏏 Match Starting Soon!',
          body: `${match.Team1} vs ${match.Team2} starts in 15 minutes`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `match-15-${match.Match}`,
          data: { matchId: match.Match, type: '15min' },
          actions: [
            { action: 'view', title: '👀 View Match' },
            { action: 'dismiss', title: '❌ Dismiss' }
          ]
        });
      }, time15Min.getTime() - now.getTime());
      
      notificationTimers.set(`15-${match.Match}`, timeout15);
    }

    // 5 minutes before notification
    if (time5Min > now) {
      const timeout5 = setTimeout(() => {
        showNotification({
          title: '⚡ Match Starting Very Soon!',
          body: `${match.Team1} vs ${match.Team2} starts in 5 minutes`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `match-5-${match.Match}`,
          data: { matchId: match.Match, type: '5min' },
          actions: [
            { action: 'view', title: '🔴 Watch Live' },
            { action: 'dismiss', title: '❌ Dismiss' }
          ]
        });
      }, time5Min.getTime() - now.getTime());
      
      notificationTimers.set(`5-${match.Match}`, timeout5);
    }

    // Match start notification
    if (matchTime > now) {
      const timeoutStart = setTimeout(() => {
        showNotification({
          title: '🔴 LIVE NOW!',
          body: `${match.Team1} vs ${match.Team2} is starting now!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `match-live-${match.Match}`,
          data: { matchId: match.Match, type: 'live' },
          actions: [
            { action: 'view', title: '📺 Watch Now' },
            { action: 'dismiss', title: '❌ Later' }
          ],
          requireInteraction: true // Keep notification visible
        });
      }, matchTime.getTime() - now.getTime());
      
      notificationTimers.set(`live-${match.Match}`, timeoutStart);
    }
  });
}

// Show notification function
function showNotification(options) {
  self.registration.showNotification(options.title, {
    body: options.body,
    icon: options.icon || '/icon-192.png',
    badge: options.badge || '/icon-192.png',
    tag: options.tag,
    data: options.data,
    actions: options.actions || [],
    requireInteraction: options.requireInteraction || false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view' || event.action === '') {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
  // 'dismiss' action just closes the notification (default behavior)
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification.tag);
});

// Background sync for updating match data
self.addEventListener('sync', event => {
  if (event.tag === 'update-matches') {
    event.waitUntil(updateMatchData());
  }
});

// Update match data in background
async function updateMatchData() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbxzx4xcwEGidoxEd7BQshkR9FKHjK5o0p8ukNY4NsKNR0EsShY7eV3MUxA2iXz1V8bmHg/exec');
    const data = await response.json();
    matches = data.matches || [];
    scheduleNotifications();
  } catch (error) {
    console.error('Failed to update match data:', error);
  }
}

// Periodic background update (every 30 minutes)
setInterval(() => {
  updateMatchData();
}, 30 * 60 * 1000);
