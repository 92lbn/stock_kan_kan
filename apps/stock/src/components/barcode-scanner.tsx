"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type CameraRange = { min: number; max: number; step?: number };
type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: CameraRange;
};
type CameraSettings = MediaTrackSettings & { zoom?: number };
type CameraFocusMode = "continuous" | "single-shot";

function cameraConstraints(focusMode?: CameraFocusMode, zoom?: number): MediaTrackConstraints {
  const cameraOptions: Record<string, string | number> = {};
  if (focusMode) cameraOptions.focusMode = focusMode;
  if (zoom !== undefined) cameraOptions.zoom = zoom;

  return {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    ...(Object.keys(cameraOptions).length > 0 ? { advanced: [cameraOptions] } : {}),
  } as unknown as MediaTrackConstraints;
}

async function applyCameraSettings(track: MediaStreamTrack, focusMode?: CameraFocusMode, zoom?: number) {
  await track.applyConstraints(cameraConstraints(focusMode, zoom));
}

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
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const continuousFocusRef = useRef(false);
  const zoomRef = useRef<number | undefined>(undefined);
  const focusTimerRef = useRef<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [canRefocus, setCanRefocus] = useState(false);
  const [focusStatus, setFocusStatus] = useState<string | null>(null);
  const [zoomRange, setZoomRange] = useState<CameraRange | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

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
        const constraints: MediaStreamConstraints = { video: cameraConstraints("continuous") };
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
        // Après autorisation, on n'applique que les réglages réellement exposés
        // par la caméra. Les navigateurs plus anciens continuent avec leurs défauts.
        const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()[0];
        trackRef.current = track ?? null;
        try {
          if (track && typeof track.getCapabilities === "function") {
            const capabilities = track.getCapabilities() as CameraCapabilities;
            const focusModes = capabilities.focusMode ?? [];
            continuousFocusRef.current = focusModes.includes("continuous");
            setCanRefocus(focusModes.includes("single-shot"));

            const zoomCapability = capabilities.zoom;
            if (zoomCapability && zoomCapability.max > zoomCapability.min) {
              const currentZoom = (track.getSettings() as CameraSettings).zoom ?? zoomCapability.min;
              const boundedZoom = Math.min(zoomCapability.max, Math.max(zoomCapability.min, currentZoom));
              zoomRef.current = boundedZoom;
              setZoom(boundedZoom);
              setZoomRange(zoomCapability);
            }

            if (continuousFocusRef.current) {
              await applyCameraSettings(track, "continuous", zoomRef.current);
            }
          }
        } catch {
          /* réglages avancés non supportés : la caméra conserve ses défauts */
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
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      trackRef.current = null;
      controls?.stop();
    };
  }, []);

  async function refocus() {
    const track = trackRef.current;
    if (!track) return;
    setFocusStatus("Mise au point en cours…");
    try {
      await applyCameraSettings(track, "single-shot", zoomRef.current);
      setFocusStatus("Mise au point relancée.");
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      if (continuousFocusRef.current) {
        focusTimerRef.current = window.setTimeout(() => {
          void applyCameraSettings(track, "continuous", zoomRef.current).catch(() => undefined);
        }, 1200);
      }
    } catch {
      setFocusStatus("La mise au point manuelle n’est pas disponible sur cet appareil.");
    }
  }

  async function updateZoom(nextZoom: number) {
    const track = trackRef.current;
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    if (!track) return;
    try {
      await applyCameraSettings(track, continuousFocusRef.current ? "continuous" : undefined, nextZoom);
    } catch {
      setFocusStatus("Le zoom de la caméra n’a pas pu être modifié.");
    }
  }

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
        <>
          <p className="mt-2 text-center text-sm text-muted">
            Garde le code à environ 15–25 cm, à l’horizontale dans le cadre, puis reste immobile.
          </p>
          {(canRefocus || (zoomRange && zoom !== null)) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {canRefocus && (
                <button
                  type="button"
                  onClick={() => void refocus()}
                  className="min-h-11 rounded-md border border-line-strong bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Refaire la mise au point
                </button>
              )}
              {zoomRange && zoom !== null && (
                <div className="rounded-md border border-line bg-card px-3 py-2">
                  <label htmlFor="camera-zoom" className="flex items-center justify-between text-sm font-medium text-ink">
                    <span>Zoom caméra</span>
                    <span aria-hidden="true">×{zoom.toFixed(1)}</span>
                  </label>
                  <input
                    id="camera-zoom"
                    type="range"
                    min={zoomRange.min}
                    max={zoomRange.max}
                    step={zoomRange.step && zoomRange.step > 0 ? zoomRange.step : 0.1}
                    value={zoom}
                    onChange={(event) => void updateZoom(Number(event.target.value))}
                    className="min-h-11 w-full accent-[var(--accent)]"
                    aria-valuetext={`Zoom ${zoom.toFixed(1)} fois`}
                  />
                </div>
              )}
            </div>
          )}
          {focusStatus && <p role="status" className="mt-2 text-center text-sm text-muted">{focusStatus}</p>}
        </>
      )}
    </div>
  );
}
