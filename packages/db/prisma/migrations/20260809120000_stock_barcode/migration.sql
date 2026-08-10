-- AlterTable
ALTER TABLE "stock_items" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_barcode_key" ON "stock_items"("barcode");

