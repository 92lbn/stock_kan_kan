-- Certains produits non périssables n'ont ni DLC ni DDM.
ALTER TABLE "stock_lots" ALTER COLUMN "expiryDate" DROP NOT NULL;
