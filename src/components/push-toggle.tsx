"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription, sendTestPush } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function subscribe() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permission refusée. Autorisez les notifications dans votre navigateur.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMessage("Clé VAPID manquante côté serveur.");
        setBusy(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      await sendTestPush();
      setSubscribed(true);
      setMessage("Notifications activées ! Une notification test vient d'être envoyée.");
    } catch {
      setMessage("Impossible d'activer les notifications sur cet appareil.");
    }
    setBusy(false);
  }

  async function unsubscribe() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notifications désactivées.");
    } catch {
      setMessage("Erreur lors de la désactivation.");
    }
    setBusy(false);
  }

  if (!supported) {
    return (
      <p className="text-sm text-zinc-500">
        Les notifications push ne sont pas supportées par ce navigateur. Sur iPhone, ajoutez
        d&apos;abord le site à l&apos;écran d&apos;accueil.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {subscribed ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={unsubscribe}>
          {busy ? "..." : "Désactiver les notifications"}
        </Button>
      ) : (
        <Button type="button" disabled={busy} onClick={subscribe}>
          {busy ? "..." : "Activer les notifications"}
        </Button>
      )}
      {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
    </div>
  );
}
