/**
 * Service Worker для Учёт продукции 2
 * 
 * Обеспечивает кэширование статических ресурсов и офлайн работу
 */

const CACHE_NAME = 'uchet2-cache-v3.0.2';
const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './backup.js',
    './work-schedule.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Установка');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Кэширование статических файлов');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Активация');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Удаляем старые кэши
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Удаление старого кэша', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Обработка запросов (Cache First стратегия)
self.addEventListener('fetch', (event) => {
    // Игнорируем non-GET запросы
    if (event.request.method !== 'GET') {
        return;
    }

    // Игнорируем запросы к chrome-extension и других протоколов
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Если ресурс найден в кэше, возвращаем его
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Иначе делаем сетевой запрос
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Проверяем валидность ответа
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Клонируем ответ для кэширования
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // Если сетевой запрос не удался, возвращаем офлайн страницу
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }

                        // Для других ресурсов возвращаем пустой ответ
                        return new Response('', {
                            status: 408,
                            statusText: 'Offline'
                        });
                    });
            })
    );
});

// Обработка сообщений от приложения
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background sync (если поддерживается)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-backup') {
        event.waitUntil(doBackgroundBackup());
    }
});

// Фоновый бэкап
async function doBackgroundBackup() {
    try {
        // Проверяем, нужен ли автоматический бэкап
        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
            clients[0].postMessage({
                type: 'CHECK_AUTO_BACKUP'
            });
        }
    } catch (error) {
        console.error('Background backup error:', error);
    }
}

// Push notifications (для будущих версий)
self.addEventListener('push', (event) => {
    const options = {
        body: 'Время создать резервную копию данных',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'backup-reminder',
        requireInteraction: true,
        actions: [
            {
                action: 'backup',
                title: 'Создать бэкап'
            },
            {
                action: 'dismiss',
                title: 'Напомнить позже'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Учёт продукции 2', options)
    );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'backup') {
        event.waitUntil(
            clients.openWindow('./index.html?backup=true')
        );
    }
});
