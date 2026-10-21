const CACHE_NAME = 'aruskas-pwa-v47';
const ICON_NAMES = 'airplane apple-logo baby bank barbell basket bicycle book book-open bowl-food bread briefcase buildings bus calendar camera car chart-line-up cloud coffee coins cooking-pot credit-card currency-circle-dollar desktop device-mobile drop film-strip first-aid first-aid-kit fish fork-knife game-controller gas-pump gift globe hamburger hand-coins hand-heart hands-praying heart house house-line laptop leaf lightning map-pin microphone money motorcycle music-notes paint-brush park paw-print person-simple-run phone pencil-simple piggy-bank pill popcorn question receipt receipt-x savings-sheep shield-check shopping-bag shopping-cart sneaker squares-four storefront student graduation-cap suitcase sun t-shirt train users-three wallet wifi-high'.split(' ');
const APP_SHELL = ['./', './index.html', './manifest.json', './warm-ui.css?v=20261021.29', './ui-icons.js?v=20261021.3', './savings-core.js?v=20261021.2', './receipt-store.js?v=20261021.1', './receipt-gallery.js?v=20261021.4', './receipt-backup.js?v=20261021.1', './icons/icon-192.png', './icons/icon-512.png', ...ICON_NAMES.map(name => `./icons/category/${name}.svg`)];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isHtml) {
    // Network-first for HTML pages so development changes & updates load immediately
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Stale-while-revalidate / cache-first for other static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => null);
      return cached || fetchPromise;
    })
  );
});
