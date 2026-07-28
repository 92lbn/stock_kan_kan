import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { REAL_INVENTORY, OLD_SAMPLE_NAMES } from "./inventory-data";

// Scripts CLI : session pooler (DIRECT_URL), pas le transaction pooler.
const adapter = new PrismaPg(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
const db = new PrismaClient({ adapter });

async function main() {
  // 1. Retirer les anciens articles d'exemple (placeholders) — ciblage précis :
  //    seulement les noms d'exemple ET dans leurs anciennes catégories, pour ne
  //    jamais supprimer un article réel saisi manuellement.
  const removed = await db.stockItem.deleteMany({
    where: {
      name: { in: OLD_SAMPLE_NAMES },
      category: { in: ["ALIMENTAIRE", "HYGIENE", "EMBALLAGE"] },
    },
  });
  if (removed.count > 0) {
    console.log(`${removed.count} article(s) d'exemple retirés.`);
  }

  // 2. Ajouter le vrai inventaire (ignore un produit déjà présent, par nom).
  let added = 0;
  for (const item of REAL_INVENTORY) {
    const existing = await db.stockItem.findFirst({ where: { name: item.name } });
    if (existing) continue;
    await db.stockItem.create({ data: item });
    added++;
  }

  console.log(`${added} produit(s) du vrai inventaire importés (${REAL_INVENTORY.length} au total).`);
  console.log("Quantités et seuils d'alerte à 0 par défaut : ajustez-les dans l'app.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
