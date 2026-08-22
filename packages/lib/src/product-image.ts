const MAX_PRODUCT_IMAGE_BYTES = 350_000;

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  "image/webp": (bytes) =>
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
};

export type ProductImage = { bytes: Uint8Array<ArrayBuffer>; mimeType: keyof typeof signatures };

export function parseProductImageDataUrl(value?: string): ProductImage | undefined {
  if (!value) return undefined;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error("Format de photo non pris en charge.");

  const mimeType = match[1] as keyof typeof signatures;
  const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
  if (bytes.length === 0 || bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("La photo est trop volumineuse.");
  }
  if (!signatures[mimeType](bytes)) {
    throw new Error("Le contenu de la photo est invalide.");
  }
  return { bytes, mimeType };
}

export { MAX_PRODUCT_IMAGE_BYTES };
