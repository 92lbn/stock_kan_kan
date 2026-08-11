-- Code personnel de pointage kiosk. Migration additive : aucun compte existant
-- n'est modifié et aucun PIN en clair n'est stocké.
ALTER TABLE "users" ADD COLUMN "pinHash" TEXT;

-- La limite globale du login et du kiosk filtre uniquement sur createdAt.
CREATE INDEX "login_attempts_createdAt_idx" ON "login_attempts"("createdAt");
