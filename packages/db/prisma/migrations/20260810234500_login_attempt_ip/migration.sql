ALTER TABLE "login_attempts" ADD COLUMN "ip" TEXT;
CREATE INDEX "login_attempts_ip_createdAt_idx" ON "login_attempts"("ip", "createdAt");
