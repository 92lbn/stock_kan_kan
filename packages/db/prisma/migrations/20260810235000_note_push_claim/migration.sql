ALTER TABLE "notes"
  ADD COLUMN "notificationClaimedAt" TIMESTAMP(3),
  ADD COLUMN "notificationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastNotificationError" TEXT;
CREATE INDEX "notes_notificationClaimedAt_idx" ON "notes"("notificationClaimedAt");
