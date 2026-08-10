// Service worker — Gestion Restaurant
// 1) Web Push  2) cache app-shell (stale-while-revalidate)  3) lecture hors ligne
//
// Une cuisine a du wifi capricieux : les pages déjà visitées (stock, recettes…)
// restent lisibles hors ligne à partir du dernier état connu.

const CACHE = "kan-kan-v2";
const OFFLINE_URL = "/offline";
// Ressources de secours mises en cache à l'installation.
const PRECACHE = ["/offline", "/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // ne touche pas aux mutations (server actions)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // On NE touche PAS aux données RSC de Next : laisser passer nativement pour
  // préserver le préchargement / streaming (navigation quasi instantanée).
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  // Actifs immuables (JS/CSS/polices/icônes) : cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetchAndCache(request))
    );
    return;
  }

  // Chargement complet d'une page (navigate) : réseau d'abord, repli hors ligne.
  // On ne met PAS en cache (pages dynamiques par utilisateur) : juste un filet offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error())
    );
  }
});

async function fetchAndCache(request) {
  const response = await fetch(request);
  // Ne met en cache que les réponses complètes et valides.
  if (response && response.ok && response.status === 200) {
    const clone = response.clone();
    const cache = await caches.open(CACHE);
    cache.put(request, clone);
  }
  return response;
}

// Background Sync — rejoue les mouvements de stock faits hors ligne.
// [EN ATTENTE] Le rejeu nécessite un endpoint JSON dédié (POST /api/stock/movement)
// et une mise en file IndexedDB côté client ; le formulaire actuel passe par une
// server action non rejouable telle quelle. Le point d'entrée est prêt ci-dessous.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-stock-movements") {
    // event.waitUntil(replayQueuedMovements());
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Rappel", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Gestion Restaurant";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
