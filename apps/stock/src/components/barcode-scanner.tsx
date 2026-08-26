"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type CameraFocusMode = "continuous" | "single-shot";
type CameraCapabilities = MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean };
type CameraAdvancedConstraints = MediaTrackConstraintSet & {
  focusMode?: CameraFocusMode;
  torch?: boolean;
};

const SAVED_CAMERA_KEY = "kan-kan-stock-scanner-camera";

function cameraConstraints(deviceId?: string, strictRear = true): MediaTrackConstraints {
  return {
    ...(deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: strictRear ? { exact: "environment" } : { ideal: "environment" } }),
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };
}

async function applyCameraSettings(
  track: MediaStreamTrack,
  settings: { focusMode?: CameraFocusMode; torch?: boolean },
) {
  const advanced: CameraAdvancedConstraints = {};
  if (settings.focusMode) advanced.focusMode = settings.focusMode;
  if (settings.torch !== undefined) advanced.torch = settings.torch;
  if (Object.keys(advanced).length > 0) {
    await track.applyConstraints({ advanced: [advanced] });
  }
}

function cameraLabel(camera: MediaDeviceInfo, index: number, activeCameraId: string | null) {
  const base = camera.label.trim() || `Caméra ${index + 1}`;
  return camera.deviceId === activeCameraId ? `${base} — utilisée` : base;
}

// Le standard Web ne distingue pas l'objectif principal sur les mobiles
// multi-capteurs : l'utilisateur peut choisir l'objectif et ce choix est mémorisé.
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
  const [cameraReady, setCameraReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [requestedCameraId, setRequestedCameraId] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let stream: MediaStream | null = null;
    let done = false;

    async function openCamera(deviceId?: string) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: cameraConstraints(deviceId),
          audio: false,
        });
      } catch (error) {
        if (deviceId) throw error;
        return navigator.mediaDevices.getUserMedia({
          video: cameraConstraints(undefined, false),
          audio: false,
        });
      }
    }

    async function start() {
      setMsg(null);
      setCameraReady(false);
      setTorchOn(false);
      setCanRefocus(false);
      continuousFocusRef.current = false;

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

        stream = await openCamera(requestedCameraId ?? undefined);
        let availableCameras = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === "videoinput",
        );

        if (!requestedCameraId) {
          const savedCameraId = window.localStorage.getItem(SAVED_CAMERA_KEY);
          if (savedCameraId && availableCameras.some((camera) => camera.deviceId === savedCameraId)) {
            const currentId = stream.getVideoTracks()[0]?.getSettings().deviceId;
            if (currentId !== savedCameraId) {
              stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
              stream = await openCamera(savedCameraId);
            }
          }
        }

        if (done) {
          stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
          return;
        }

        controls = await reader.decodeFromStream(stream, videoRef.current!, (result, _err, ctrl) => {
          if (result && !done) {
            done = true;
            ctrl.stop();
            onDetectedRef.current(result.getText());
          }
        });
        controlsRef.current = controls;

        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        const selectedId = track?.getSettings().deviceId ?? null;
        setActiveCameraId(selectedId);
        setCameraReady(Boolean(track));

        availableCameras = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === "videoinput",
        );
        setCameras(availableCameras);

        try {
          if (track && typeof track.getCapabilities === "function") {
            const capabilities = track.getCapabilities() as CameraCapabilities;
            const focusModes = capabilities.focusMode ?? [];
            continuousFocusRef.current = focusModes.includes("continuous");
            setCanRefocus(focusModes.includes("single-shot"));
            if (continuousFocusRef.current) {
              await applyCameraSettings(track, { focusMode: "continuous" });
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

    void start();
    return () => {
      done = true;
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      controlsRef.current = null;
      trackRef.current = null;
      controls?.stop();
      stream?.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    };
  }, [requestedCameraId]);

  function changeCamera(deviceId: string) {
    if (!deviceId || deviceId === activeCameraId) return;
    window.localStorage.setItem(SAVED_CAMERA_KEY, deviceId);
    setCameraStatus("Changement de caméra…");
    setCameraReady(false);
    setRequestedCameraId(deviceId);
  }

  async function refocus() {
    const track = trackRef.current;
    if (!track) return;
    setCameraStatus("Mise au point en cours…");
    try {
      await applyCameraSettings(track, { focusMode: "single-shot", torch: torchOn });
      setCameraStatus("Mise au point relancée.");
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      if (continuousFocusRef.current) {
        focusTimerRef.current = window.setTimeout(() => {
          void applyCameraSettings(track, { focusMode: "continuous", torch: torchOn }).catch(() => undefined);
        }, 1200);
      }
    } catch {
      setCameraStatus("La mise au point manuelle n’est pas disponible sur cet appareil.");
    }
  }

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const nextState = !torchOn;
    setCameraStatus(nextState ? "Activation du flash…" : "Extinction du flash…");
    try {
      try {
        await applyCameraSettings(track, {
          focusMode: continuousFocusRef.current ? "continuous" : undefined,
          torch: nextState,
        });
      } catch {
        const switchTorch = controlsRef.current?.switchTorch;
        if (!switchTorch) throw new Error("torch-unavailable");
        await switchTorch(nextState);
      }
      setTorchOn(nextState);
      setCameraStatus(nextState ? "Flash activé." : "Flash éteint.");
    } catch {
      setCameraStatus("Cet objectif ne permet pas d’utiliser le flash. Essaie une autre caméra ci-dessus.");
    }
  }

  return (
    <div className="stock-scanner-layout">
      <div className="stock-scanner-preview relative overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!msg && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[120px] w-[min(300px,calc(100%-2rem))] rounded-lg border-2 border-white/90 shadow-[0_0_0_100vmax_rgba(0,0,0,0.4)]" />
          </div>
        )}
      </div>
      <div className="stock-scanner-help">
        {msg ? (
          <div className="rounded-lg border border-danger/30 bg-card-2 p-4">
            <p className="font-medium text-danger">Caméra indisponible</p>
            <p className="mt-1 text-sm text-muted">{msg}</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-line bg-card-2 p-3">
              <p className="font-medium text-ink">Bien positionner le code</p>
              <p className="mt-1 text-sm text-muted">
                Garde-le à environ 15–25 cm, à l’horizontale dans le cadre, puis reste immobile.
              </p>
            </div>
            {cameras.length > 1 && (
              <div className="mt-3">
                <label htmlFor="scanner-camera" className="mb-1 block text-sm font-medium text-ink">
                  Caméra utilisée
                </label>
                <select
                  id="scanner-camera"
                  value={activeCameraId ?? ""}
                  onChange={(event) => changeCamera(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-line-strong bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {cameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {cameraLabel(camera, index, activeCameraId)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-muted">
                  Choisis l’objectif net à courte distance : ce choix restera mémorisé sur cet appareil.
                </p>
              </div>
            )}
            {cameraReady && (
              <div className={`mt-3 grid gap-3 ${canRefocus ? "sm:grid-cols-2 lg:grid-cols-1" : ""}`}>
                {canRefocus && (
                  <button
                    type="button"
                    onClick={() => void refocus()}
                    className="min-h-11 rounded-md border border-line-strong bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Refaire la mise au point
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void toggleTorch()}
                  aria-pressed={torchOn}
                  className="min-h-11 rounded-md border border-line-strong bg-card px-3 py-2 text-sm font-medium text-ink hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {torchOn ? "Éteindre le flash" : "Activer le flash"}
                </button>
              </div>
            )}
            {cameraStatus && (
              <p role="status" className="mt-2 text-sm text-muted">
                {cameraStatus}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
