-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_identifier_createdAt_idx" ON "login_attempts"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_employeeId_date_startTime_key" ON "shifts"("employeeId", "date", "startTime");


-- Sécurité Supabase : active RLS sur toutes les tables du schéma public.
-- Sans policy, l'API PostgREST (rôles anon/authenticated) ne renvoie aucune ligne
-- (deny par défaut). Prisma se connecte en propriétaire des tables et contourne RLS,
-- donc l'application continue de fonctionner normalement.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_ideas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
