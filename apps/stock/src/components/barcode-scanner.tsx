"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

// Scan via la caméra du navigateur (getUserMedia) + décodage ZXing en JS.
// Fonctionne sur iPhone/Safari comme sur Android, MAIS uniquement en contexte
// sécurisé (HTTPS ou localhost) — sinon le navigateur bloque la caméra.
export function BarcodeScanner({
  onDetected,
  onError,
}: {
  onDetected: (code: string) => void;
  onError?: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let done = false;

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        const m = "La caméra nécessite HTTPS (ou localhost). En production (Vercel), le scan fonctionnera.";
        setMsg(m);
        onErrorRef.current?.(m);
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 80,
          delayBetweenScanSuccess: 500,
        });
        // Caméra arrière, haute résolution (petits codes-barres) + autofocus continu.
        const constraints: MediaStreamConstraints = {
          // `focusMode` est une contrainte expérimentale absente des types DOM :
          // best-effort, ignorée par les navigateurs qui ne la supportent pas.
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [{ focusMode: "continuous" }],
          } as unknown as MediaTrackConstraints,
        };
        controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current!,
          (result, _err, ctrl) => {
            if (result && !done) {
              done = true;
              ctrl.stop();
              onDetectedRef.current(result.getText());
            }
          }
        );
        // Certains Android n'appliquent l'autofocus qu'après coup.
        const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()[0];
        try {
          await track?.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          } as unknown as MediaTrackConstraints);
        } catch {
          /* focusMode non supporté : le système gère l'autofocus */
        }
      } catch {
        const m = "Caméra indisponible ou accès refusé. Saisis le code à la main.";
        setMsg(m);
        onErrorRef.current?.(m);
      }
    }

    start();
    return () => {
      done = true;
      controls?.stop();
    };
  }, []);

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          muted
          playsInline
        />
        {!msg && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[120px] w-[min(300px,calc(100%-2rem))] rounded-lg border-2 border-white/90 shadow-[0_0_0_100vmax_rgba(0,0,0,0.4)]" />
          </div>
        )}
      </div>
      {msg ? (
        <p className="mt-2 text-sm text-danger">{msg}</p>
      ) : (
        <p className="mt-2 text-center text-sm text-muted">
          Place le code-barres à l’horizontale dans le cadre et reste immobile.
        </p>
      )}
    </div>
  );
}
