-- Empêche qu'un mouvement envoyé deux fois depuis le Dashboard soit comptabilisé deux fois.
-- Nullable pour rester compatible avec tous les mouvements historiques et ceux de la tablette.
ALTER TABLE "stock_movements" ADD COLUMN "operationId" TEXT;

CREATE UNIQUE INDEX "stock_movements_operationId_key"
  ON "stock_movements"("operationId");
