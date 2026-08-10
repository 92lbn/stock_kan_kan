-- Droit d'accès explicite à l'application Stock.
-- Les administrateurs restent autorisés implicitement dans la garde serveur.
ALTER TABLE "users" ADD COLUMN "canStock" BOOLEAN NOT NULL DEFAULT false;
