const STATIC_CACHE = "flowsoundz-static-v4";

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { return; }
  const { title = "FlowSoundz Radio", body = "", url = "/radio", icon, badge } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon ?? "/brand/flowsoundz-fr-appicon-dark.png",
      badge: badge ?? "/brand/flowsoundz-fr-icon-dark.png",
      data: { url },
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/radio";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

const APP_SHELL = ["/", "/radio", "/songs", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.headers.has("range")) {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    request.destination === "audio" ||
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/stream/") ||
    url.pathname.startsWith("/queue") ||
    url.pathname.startsWith("/songs") ||
    url.pathname.startsWith("/api/local-stream/") ||
    url.pathname.startsWith("/api/local-catalog/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/radio");
        return cached || Response.error();
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
        return response;
      });
    }),
  );
});
