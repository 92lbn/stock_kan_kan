-- Lots de stock : source de vérité pour la quantité et la DLC.
CREATE TABLE "stock_lots" (
  "id" TEXT NOT NULL,
  "stockItemId" TEXT NOT NULL,
  "lotNumber" TEXT,
  "expiryDate" DATE NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_lots_stockItemId_fkey" FOREIGN KEY ("stockItemId")
    REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "stock_lots_stockItemId_expiryDate_idx" ON "stock_lots"("stockItemId", "expiryDate");
CREATE INDEX "stock_lots_expiryDate_idx" ON "stock_lots"("expiryDate");
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- Reprise sans perte : chaque quantité existante devient un lot technique à DLC lointaine.
-- Ces lots devront être régularisés lors du prochain inventaire physique.
INSERT INTO "stock_lots" ("id", "stockItemId", "lotNumber", "expiryDate", "quantity")
SELECT 'reprise_' || "id", "id", 'REPRISE', DATE '2099-12-31', "quantity"
FROM "stock_items"
WHERE "quantity" > 0;
