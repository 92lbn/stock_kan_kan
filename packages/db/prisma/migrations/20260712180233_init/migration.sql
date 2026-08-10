-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "StockCategory" AS ENUM ('MATERIEL_INFORMATIQUE', 'CONSOMMABLES', 'ALIMENTAIRE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('MENU', 'BOISSON', 'MARINADE');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TIKTOK', 'SNAPCHAT', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('IDEA', 'READY', 'SCHEDULED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "StockCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "TimeEntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "RecipeCategory" NOT NULL,
    "ingredients" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ideas" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "caption" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'READY',
    "scheduledAt" TIMESTAMP(3),
    "mediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_key" ON "users"("identifier");

-- CreateIndex
CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");

-- CreateIndex
CREATE INDEX "stock_movements_stockItemId_idx" ON "stock_movements"("stockItemId");

-- CreateIndex
CREATE INDEX "shifts_employeeId_date_idx" ON "shifts"("employeeId", "date");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_timestamp_idx" ON "time_entries"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "recipes_category_idx" ON "recipes"("category");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_posts_mediaId_key" ON "scheduled_posts"("mediaId");

-- CreateIndex
CREATE INDEX "scheduled_posts_scheduledAt_idx" ON "scheduled_posts"("scheduledAt");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
