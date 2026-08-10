-- AlterTable
ALTER TABLE "stock_items" ADD COLUMN     "allergens" TEXT,
ADD COLUMN     "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "sellingPrice" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_stockItemId_idx" ON "recipe_ingredients"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_stockItemId_key" ON "recipe_ingredients"("recipeId", "stockItemId");

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS sur la nouvelle table (cf. politique globale Phase 2).
ALTER TABLE "recipe_ingredients" ENABLE ROW LEVEL SECURITY;
