import { describe, expect, it } from "vitest";
import { parseProductImageDataUrl } from "./product-image";

describe("photo produit", () => {
  it("accepte une image JPEG valide", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString("base64");
    const image = parseProductImageDataUrl(`data:image/jpeg;base64,${jpeg}`);
    expect(image?.mimeType).toBe("image/jpeg");
    expect(image?.bytes).toHaveLength(6);
  });

  it("refuse une extension image dont le contenu est falsifié", () => {
    const fake = Buffer.from("pas une image").toString("base64");
    expect(() => parseProductImageDataUrl(`data:image/jpeg;base64,${fake}`)).toThrow(
      "Le contenu de la photo est invalide."
    );
  });

  it("refuse les formats non autorisés", () => {
    expect(() => parseProductImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toThrow(
      "Format de photo non pris en charge."
    );
  });
});
