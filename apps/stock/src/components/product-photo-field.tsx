"use client";

import { useId, useState } from "react";
import { Button } from "@stock-kan-kan/ui/button";

const MAX_DIMENSION = 720;

async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choisis une image valide.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de préparer la photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.78, 0.66, 0.54, 0.42]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (Math.ceil((dataUrl.length * 3) / 4) <= 350_000) return dataUrl;
    }
    throw new Error("La photo reste trop volumineuse. Essaie de la recadrer.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProductPhotoField({ existingSrc }: { existingSrc?: string }) {
  const id = useId();
  const [imageData, setImageData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = imageData || (!removed ? existingSrc : undefined);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setImageData(await compressPhoto(file));
      setRemoved(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de préparer la photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">Photo du produit</legend>
      <input type="hidden" name="imageData" value={imageData} />
      <input type="hidden" name="removeImage" value={removed ? "true" : "false"} />
      <div className="flex items-center gap-3">
        <div className="grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-xl border border-line bg-card-2 text-2xl text-muted">
          {preview ? (
            // Image authentifiée et déjà compressée ; pas de second passage par l'optimiseur Next.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Aperçu du produit" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">◇</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-card px-3 text-sm font-medium text-ink hover:bg-card-2">
            {busy ? "Préparation…" : preview ? "Changer la photo" : "Ajouter une photo"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            disabled={busy}
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="sr-only"
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {preview && (
            <Button type="button" variant="ghost" onClick={() => { setImageData(""); setRemoved(true); }}>
              Retirer
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">La photo est automatiquement réduite avant l’envoi.</p>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
