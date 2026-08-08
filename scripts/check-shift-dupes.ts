// Contrôle LECTURE SEULE : détecte les doublons (employeeId, date, startTime) qui
// feraient échouer la contrainte unique de la migration Phase 2. N'écrit rien.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
});

async function main() {
  const rows = await db.$queryRaw<{ employeeId: string; c: number }[]>`
    SELECT "employeeId", "date", "startTime", count(*)::int AS c
    FROM shifts
    GROUP BY "employeeId", "date", "startTime"
    HAVING count(*) > 1
  `;
  const totalShifts = await db.shift.count();
  console.log(`Créneaux au total : ${totalShifts}`);
  console.log(`Groupes en doublon : ${rows.length}`);
  if (rows.length > 0) {
    console.log("DOUBLONS DÉTECTÉS — dédoublonner avant la migration :");
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log("OK : aucun doublon, la contrainte unique passera.");
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
