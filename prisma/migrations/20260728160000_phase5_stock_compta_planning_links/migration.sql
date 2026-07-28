-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "ledgerEntryId" TEXT,
ADD COLUMN     "unitCost" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "daily_forecasts" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "expectedRevenue" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_forecasts_date_key" ON "daily_forecasts"("date");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- RLS sur la nouvelle table (cf. politique globale Phase 2).
ALTER TABLE "daily_forecasts" ENABLE ROW LEVEL SECURITY;
