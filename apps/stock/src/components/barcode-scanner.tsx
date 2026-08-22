"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
};
type CameraFocusMode = "continuous" | "single-shot";

function cameraConstraints(focusMode?: CameraFocusMode, deviceId?: string, strictRear = true): MediaTrackConstraints {
  const cameraOptions: Record<string, string> = {};
  if (focusMode) cameraOptions.focusMode = focusMode;

  return {
    ...(deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: strictRear ? { exact: "environment" } : { ideal: "environment" } }),
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    ...(Object.keys(cameraOptions).length > 0 ? { advanced: [cameraOptions] } : {}),
  } as unknown as MediaTrackConstraints;
}

async function applyCameraSettings(track: MediaStreamTrack, focusMode?: CameraFocusMode) {
  await track.applyConstraints(cameraConstraints(focusMode, track.getSettings().deviceId));
}

function findPrimaryRearCamera(devices: MediaDeviceInfo[], activeDeviceId?: string) {
  const cameras = devices.filter((device) => device.kind === "videoinput");
  const rearCameras = cameras.filter((device) => {
    const label = device.label.toLocaleLowerCase();
    return /back|rear|environment|arrière/.test(label) && !/front|user|avant/.test(label);
  });
  const preferred = rearCameras.find((device) => {
    const label = device.label.toLocaleLowerCase();
    return /camera2\s*0|main|primary|principal/.test(label) && !/ultra|tele|macro|depth/.test(label);
  });
  return preferred?.deviceId ?? activeDeviceId;
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
  const controlsRef = useRef<IScannerControls | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const continuousFocusRef = useRef(false);
  const focusTimerRef = useRef<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [canRefocus, setCanRefocus] = useState(false);
  const [canUseTorch, setCanUseTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let stream: MediaStream | null = null;
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
        // On ouvre strictement une caméra arrière pour obtenir les libellés, puis
        // on privilégie le capteur principal quand Android l'identifie clairement.
        let initialStream: MediaStream;
        try {
          initialStream = await navigator.mediaDevices.getUserMedia({
            video: cameraConstraints("continuous"),
          });
        } catch {
          // Ordinateurs et anciens navigateurs sans notion avant/arrière.
          initialStream = await navigator.mediaDevices.getUserMedia({
            video: cameraConstraints("continuous", undefined, false),
          });
        }
        const initialTrack = initialStream.getVideoTracks()[0];
        const activeDeviceId = initialTrack?.getSettings().deviceId;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const primaryDeviceId = findPrimaryRearCamera(devices, activeDeviceId);

        if (primaryDeviceId && activeDeviceId && primaryDeviceId !== activeDeviceId) {
          initialStream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            video: cameraConstraints("continuous", primaryDeviceId),
          });
        } else {
          stream = initialStream;
        }

        controls = await reader.decodeFromStream(
          stream,
          videoRef.current!,
          (result, _err, ctrl) => {
            if (result && !done) {
              done = true;
              ctrl.stop();
              onDetectedRef.current(result.getText());
            }
          }
        );
        controlsRef.current = controls;
        setCanUseTorch(typeof controls.switchTorch === "function");
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

            if (continuousFocusRef.current) {
              await applyCameraSettings(track, "continuous");
            }
          }
        } catch {
          /* réglages avancés non supportés : la caméra conserve ses défauts */
        }
      } catch {
        stream?.getTracks().forEach((mediaTrack) => mediaTrack.stop());
        const m = "Caméra indisponible ou accès refusé. Saisis le code à la main.";
        setMsg(m);
        onErrorRef.current?.(m);
      }
    }

    start();
    return () => {
      done = true;
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      controlsRef.current = null;
      trackRef.current = null;
      controls?.stop();
      stream?.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    };
  }, []);

  async function refocus() {
    const track = trackRef.current;
    if (!track) return;
    setCameraStatus("Mise au point en cours…");
    try {
      await applyCameraSettings(track, "single-shot");
      setCameraStatus("Mise au point relancée.");
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      if (continuousFocusRef.current) {
        focusTimerRef.current = window.setTimeout(() => {
          void applyCameraSettings(track, "continuous").catch(() => undefined);
        }, 1200);
      }
    } catch {
      setCameraStatus("La mise au point manuelle n’est pas disponible sur cet appareil.");
    }
  }

  async function toggleTorch() {
    const switchTorch = controlsRef.current?.switchTorch;
    if (!switchTorch) return;
    const nextState = !torchOn;
    setCameraStatus(nextState ? "Activation du flash…" : "Extinction du flash…");
    try {
      await switchTorch(nextState);
      setTorchOn(nextState);
      setCameraStatus(nextState ? "Flash activé." : "Flash éteint.");
    } catch {
      setCameraStatus("Le flash n’est pas disponible sur cet appareil.");
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
          {(canRefocus || canUseTorch) && (
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
              {canUseTorch && (
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  aria-pressed={torchOn}
                  className="min-h-11 rounded-md border border-line-strong bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {torchOn ? "Éteindre le flash" : "Activer le flash"}
                </button>
              )}
            </div>
          )}
          {cameraStatus && <p role="status" className="mt-2 text-center text-sm text-muted">{cameraStatus}</p>}
        </>
      )}
    </div>
  );
}
