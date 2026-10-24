/* Service worker của Mì Quảng Bách Khoa: chỉ để nhận thông báo thách đấu (Web Push).
   Không cache gì, game vẫn tải mới từ mạng như cũ. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Mì Quảng Bách Khoa', body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    if (d.het_han && new Date(d.het_han) < Date.now()) return;          // lời thách đã hết hạn
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Game đang mở và đang nhìn thấy: thông báo trong game đã hiện rồi, không làm phiền thêm
    if (wins.some(w => w.visibilityState === 'visible' && w.focused)) return;
    await self.registration.showNotification(d.title || 'Có lời thách đấu!', {
      body: d.body || 'Mở game để trả lời.',
      tag: d.tag || 'thach-dau',
      renotify: true,
      requireInteraction: true,
      icon: 'icons/icon-192.png',
      badge: 'icons/favicon-32.png',
      vibrate: [120, 80, 120, 80, 240],
      data: { url: d.url || './', id: d.id },
      actions: [{ action: 'mo', title: 'Xem lời thách' }]
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  const id = e.notification.data && e.notification.data.id;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => c.url.startsWith(self.registration.scope));
    if (w) { await w.focus(); w.postMessage({ type: 'thach', id }); return; }
    await self.clients.openWindow(url);
  })());
});
