// Service Worker untuk PWA Aplikasi Pajak Daerah
const CACHE_NAME = 'pajak-app-v1.0.0';
const STATIC_CACHE = 'pajak-static-v1.0.0';
const DYNAMIC_CACHE = 'pajak-dynamic-v1.0.0';

// Development mode detection
const isDevelopment = self.location.hostname === 'localhost' ||
                     self.location.hostname === '127.0.0.1' ||
                     self.location.port === '8888';

// Cache availability check
let cacheAvailable = true;

// Assets yang akan di-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/logo.png',
  '/cetak.js',
  '/cetakreport.js',
  '/report.js',
  '/target.js',
  '/review-wajib-pajak.js',
  '/dataService.js'
];

// Pages yang akan di-cache
const PAGES_TO_CACHE = [
  '/index.html',
  '/tambah-data.html',
  '/lihat-data.html',
  '/tambah-ketetapan.html',
  '/daftar-ketetapan.html',
  '/setoran-pajak.html',
  '/daftar-pembayaran.html',
  '/daftar-fiskal.html',
  '/review-wajib-pajak.html',
  '/report.html',
  '/target.html',
  '/detail.html',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Install event');

  // Test cache availability first
  event.waitUntil(
    caches.open(STATIC_CACHE).then(() => {
      cacheAvailable = true;
      console.log('[SW] Cache storage is available');
    }).catch(error => {
      cacheAvailable = false;
      console.warn('[SW] Cache storage not available:', error);
    }).then(() => {
      if (!cacheAvailable) {
        console.log('[SW] Skipping cache operations due to unavailability');
        return self.skipWaiting();
      }

      return Promise.all([
        caches.open(STATIC_CACHE).then(cache => {
          console.log('[SW] Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }).catch(error => {
          console.warn('[SW] Failed to cache static assets:', error);
          return Promise.resolve();
        }),
        caches.open(CACHE_NAME).then(cache => {
          console.log('[SW] Caching pages');
          return cache.addAll(PAGES_TO_CACHE);
        }).catch(error => {
          console.warn('[SW] Failed to cache pages:', error);
          return Promise.resolve();
        })
      ]).then(() => {
        console.log('[SW] Install completed');
        return self.skipWaiting();
      }).catch(error => {
        console.error('[SW] Install failed:', error);
        return self.skipWaiting();
      });
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName).catch(error => {
              console.warn('[SW] Failed to delete cache:', cacheName, error);
              return Promise.resolve(); // Continue even if deletion fails
            });
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activate completed');
      return self.clients.claim();
    }).catch(error => {
      console.error('[SW] Activate failed:', error);
      return self.clients.claim(); // Still claim clients even on error
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip if cache is not available
  if (!cacheAvailable) {
    console.log('[SW] Cache not available, serving from network only');
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/.netlify/functions/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.ok && cacheAvailable) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            }).catch(error => {
              console.warn('[SW] Failed to cache API response:', error);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if available
          if (cacheAvailable) {
            return caches.match(request).then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline API response
              return new Response(
                JSON.stringify({
                  status: 'offline',
                  message: 'Aplikasi sedang offline. Data akan disinkronkan saat koneksi kembali.'
                }),
                {
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          } else {
            // Return offline API response when cache is not available
            return new Response(
              JSON.stringify({
                status: 'offline',
                message: 'Aplikasi sedang offline. Data akan disinkronkan saat koneksi kembali.'
              }),
              {
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        })
    );
    return;
  }

  // Handle static assets - Cache First strategy
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Handle HTML pages - Network First strategy
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            // Return offline page for other requests
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Default - Network First for other resources
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'background-sync-forms') {
    event.waitUntil(syncPendingForms());
  }

  if (event.tag === 'background-sync-data') {
    event.waitUntil(syncPendingData());
  }
});

// Push notification event
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/images/logo.png',
      badge: '/images/logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Lihat Detail',
          icon: '/images/logo.png'
        },
        {
          action: 'close',
          title: 'Tutup',
          icon: '/images/logo.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to sync pending forms
async function syncPendingForms() {
  try {
    // Get pending forms from IndexedDB
    const pendingForms = await getPendingForms();

    for (const form of pendingForms) {
      try {
        const response = await fetch('/.netlify/functions/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(form.data)
        });

        if (response.ok) {
          // Remove from pending forms
          await removePendingForm(form.id);
          console.log('[SW] Form synced successfully:', form.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync form:', form.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper function to sync pending data
async function syncPendingData() {
  try {
    // Get pending data from IndexedDB
    const pendingData = await getPendingData();

    for (const data of pendingData) {
      try {
        const response = await fetch('/.netlify/functions/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data.payload)
        });

        if (response.ok) {
          // Remove from pending data
          await removePendingData(data.id);
          console.log('[SW] Data synced successfully:', data.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync data:', data.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Data sync failed:', error);
  }
}

// Placeholder functions for IndexedDB operations
// These would need to be implemented based on your data storage needs
async function getPendingForms() {
  // Implement IndexedDB logic to get pending forms
  return [];
}

async function removePendingForm(id) {
  // Implement IndexedDB logic to remove pending form
}

async function getPendingData() {
  // Implement IndexedDB logic to get pending data
  return [];
}

async function removePendingData(id) {
  // Implement IndexedDB logic to remove pending data
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'periodic-data-sync') {
    event.waitUntil(syncDataPeriodically());
  }
});

async function syncDataPeriodically() {
  try {
    // Implement periodic data synchronization
    console.log('[SW] Periodic data sync');
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}
