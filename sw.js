const CACHE_NAME = 'hsk-game-cache-v1';

// Danh sách toàn bộ tài nguyên cần lưu để chạy offline
const urlsToCache = [
    './index.html',
    './manifest.json',
    './html/about.html',
    './html/gamecenter.html',
    './html/vocab.html',
    './html/review.html',
    './html/setting.html',
    './html/flashcard.html',
    './html/gramma.html',
    './html/game1.html',
    './html/game2.html',
    './html/game3.html',
    './html/game4.html',
    './css/style.css',
    './js/core.js',
    './js/app.js',
    './js/game1.js',
    './js/game2.js',
    './js/game3.js',
    './js/game4.js',
    './js/flashcard.js',
    './js/review.js',
    './pic/backgroundapp.png',
    './pic/logo.png',
    './pic/baotri.png',
    './dataApp/hsk-1.json',
    './dataApp/hsk-2.json',
    './dataApp/hsk-3.json',
    './dataApp/hsk-4.json',
    './dataApp/hsk-5.json',
    './dataApp/hsk-6.json'
];

// Cài đặt và lưu cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Lấy dữ liệu từ cache khi không có mạng
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            return response || fetch(event.request);
        })
    );
});

// Kích hoạt và dọn dẹp cache cũ nếu có thay đổi
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
});