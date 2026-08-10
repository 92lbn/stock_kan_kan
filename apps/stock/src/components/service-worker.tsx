"use client";

import { useEffect } from "react";

// Enregistre le service worker au chargement de l'app (cache app-shell + offline).
// Idempotent : le navigateur ignore un enregistrement déjà en place.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
