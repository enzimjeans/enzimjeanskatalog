// SİVAL: internet koparsa en son görülen katalog açılsın.
// Her zaman önce internetten alınır (fiyat/stok hep güncel); sadece bağlantı yoksa kayıtlı kopya kullanılır.
const CACHE = 'sival-v1';

// İlk açılışta temel dosyaları sakla: bir sonraki açılış internetsiz de olur
const SHELL = ['./', 'index.html', 'style.css', 'ikonlar.css', 'script.js', 'config.js', 'urunler.json', 'ayarlar.json', 'manifest.webmanifest', 'ikonlar/ikon-192.png'];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    // Sadece bu sitenin normal istekleri; video (parça parça yüklenir) ve GitHub API karışmasın
    if (req.method !== 'GET' || url.origin !== self.location.origin) return;
    if (req.headers.has('range') || url.pathname.includes('/videolar/')) return;

    e.respondWith(
        fetch(req)
            .then(res => {
                if (res.ok && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
                }
                return res;
            })
            .catch(() => caches.match(req, { ignoreSearch: true })
                .then(hit => hit || (req.mode === 'navigate' ? caches.match('./', { ignoreSearch: true }) : Response.error())))
    );
});
