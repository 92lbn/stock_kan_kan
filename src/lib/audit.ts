import "server-only";

import { db } from "@/lib/db";

// Journalise une écriture dans AuditLog. `before`/`after` doivent être des objets
// JSON-sérialisables : on convertit Decimal/Date via ce helper avant de passer ici.
export async function logAudit(entry: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: toJson(entry.before),
        after: toJson(entry.after),
      },
    });
  } catch {
    // Le journal d'audit ne doit jamais faire échouer l'action métier.
  }
}

// Rend une valeur JSON-safe (Decimal → string, Date → ISO), sinon undefined.
function toJson(value: unknown) {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v instanceof Date ? v.toISOString() : v
    )
  );
}
