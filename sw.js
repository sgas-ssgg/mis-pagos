const CACHE = 'mis-pagos-v2';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg', '/sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => r))
  );
});

// Recibe mensaje desde la app para mostrar notificación
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title, {
      body:    e.data.body,
      tag:     e.data.tag || 'mis-pagos',
      vibrate: [200, 100, 200],
      icon:    '/icon.svg',
      badge:   '/icon.svg',
      data:    { url: self.location.origin + '/index.html' },
      actions: [
        { action: 'open',    title: '📋 Ver pagos' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    });
  }

  // Programar notificación diferida (para recordatorio diario)
  if (e.data?.type === 'SCHEDULE_REMINDER') {
    const delay = e.data.delay; // ms hasta la hora programada
    if (delay > 0 && delay < 86400001) {
      setTimeout(() => {
        self.registration.showNotification('💳 Mis Pagos — Recordatorio', {
          body:    e.data.body || 'Revisa tus próximos vencimientos.',
          tag:     'mis-pagos-daily',
          vibrate: [200, 100, 200],
          icon:    '/icon.svg',
          badge:   '/icon.svg',
          data:    { url: self.location.origin + '/index.html' }
        });
      }, delay);
    }
  }
});

// Clic en la notificación → abre la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || self.location.origin + '/index.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('mis-pagos') || c.url === url);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// Push real (si en el futuro se agrega FCM)
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || '💳 Mis Pagos', {
      body:    data.body || 'Tienes pagos próximos a vencer.',
      tag:     'mis-pagos-push',
      icon:    '/icon.svg',
      badge:   '/icon.svg',
      vibrate: [200, 100, 200],
      data:    { url: self.location.origin + '/index.html' }
    })
  );
});
