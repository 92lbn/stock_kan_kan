import { describe, expect, it } from "vitest";
import { encodeCode128B, internalBarcodeForItemId } from "./code128";

describe("encodeCode128B", () => {
  it("ajoute le départ B, le checksum et l’arrêt", () => {
    expect(encodeCode128B("KAN-123").codes).toEqual([104, 43, 33, 46, 13, 17, 18, 19, 8, 106]);
  });

  it("refuse les caractères non imprimables", () => {
    expect(() => encodeCode128B("KAN\n123")).toThrow();
  });
});

describe("internalBarcodeForItemId", () => {
  it("produit un identifiant interne stable et imprimable", () => {
    expect(internalBarcodeForItemId("cm1234-abcdef987654")).toBe("KAN-CM1234ABCDEF987654");
  });
});
