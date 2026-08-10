export type ExpiryGroup = "expired" | "urgent" | "soon" | "later";

export function daysUntilExpiry(expiryYmd: string, todayYmd: string) {
  const expiry = Date.parse(`${expiryYmd}T00:00:00Z`);
  const today = Date.parse(`${todayYmd}T00:00:00Z`);
  if (!Number.isFinite(expiry) || !Number.isFinite(today)) throw new Error("Date invalide.");
  return Math.round((expiry - today) / 86_400_000);
}

export function classifyExpiry(
  expiryYmd: string,
  todayYmd: string,
  urgentDays = 3,
  soonDays = 7
): ExpiryGroup {
  const days = daysUntilExpiry(expiryYmd, todayYmd);
  if (days < 0) return "expired";
  if (days <= urgentDays) return "urgent";
  if (days <= soonDays) return "soon";
  return "later";
}
