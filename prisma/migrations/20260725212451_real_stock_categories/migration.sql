-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockCategory" ADD VALUE 'MENAGER_ENTRETIEN';
ALTER TYPE "StockCategory" ADD VALUE 'EPICERIE';
ALTER TYPE "StockCategory" ADD VALUE 'LEGUMES_FRAIS';
ALTER TYPE "StockCategory" ADD VALUE 'BOISSONS';
ALTER TYPE "StockCategory" ADD VALUE 'VIANDES_POISSONS';
ALTER TYPE "StockCategory" ADD VALUE 'CONSOMMABLES_EMBALLAGES';
