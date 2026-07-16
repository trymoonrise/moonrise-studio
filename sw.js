/**
 * Moonrise Studio service worker — enables PWA install.
 * HTML stays network-first; CSS/JS use stale-while-revalidate.
 */
const CACHE_NAME = "ms-pwa-v1";
const CORE_ASSETS = ["./css/studio.css", "./dashboard.html"];

function isAssetPath(pathname) {
  return /\.(?:html?|js|css)$/i.test(pathname) || pathname.endsWith("/");
}

function isHtmlPath(pathname) {
  return /\.html?$/i.test(pathname) || pathname.endsWith("/");
}

function isScriptOrStyle(pathname) {
  return /\.(?:js|css)$/i.test(pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const navigate = req.mode === "navigate" || isHtmlPath(url.pathname);
  const liveAsset = isAssetPath(url.pathname);

  if (navigate) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => res)
        .catch(() =>
          caches.match("./dashboard.html").then((cached) => cached || Response.error())
        )
    );
    return;
  }

  if (liveAsset && isScriptOrStyle(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      })
    );
    return;
  }

  if (liveAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error()))
    );
  }
});
