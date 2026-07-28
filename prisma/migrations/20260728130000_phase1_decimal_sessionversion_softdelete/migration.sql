-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "hourlyRate" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "stock_items" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "minThreshold" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "stock_items_deletedAt_idx" ON "stock_items"("deletedAt");

-- CreateIndex
CREATE INDEX "ledger_entries_deletedAt_idx" ON "ledger_entries"("deletedAt");

