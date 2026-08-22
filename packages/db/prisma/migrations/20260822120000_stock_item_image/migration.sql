-- AlterTable
ALTER TABLE "stock_items"
ADD COLUMN IF NOT EXISTS "imageData" BYTEA,
ADD COLUMN IF NOT EXISTS "imageMimeType" TEXT;
