/* AYO BERLARI — service worker: membuat aplikasi bisa dibuka offline.
   Naikkan VERSION setiap kali index.html diperbarui agar pengguna mendapat versi baru. */
const VERSION = 'ab-v2';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const LIBS = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(LIBS.map(async u => { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (_) {} }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Peta, pencarian lokasi, dan login Google/Apple selalu lewat jaringan.
  const isLib = LIBS.includes(req.url);
  if (url.origin !== location.origin && !isLib) return;
  // Halaman: ambil dari jaringan dulu agar pembaruan cepat terlihat, cadangan dari cache saat offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(VERSION); c.put('./index.html', r.clone());
        return r;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  // File lain: cache dulu, lalu jaringan.
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r.ok) { const c = await caches.open(VERSION); c.put(req, r.clone()); }
      return r;
    } catch (_) { return Response.error(); }
  })());
});
