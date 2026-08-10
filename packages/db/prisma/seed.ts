import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { REAL_INVENTORY } from "./inventory-data";

// Scripts CLI : session pooler (DIRECT_URL), pas le transaction pooler.
const directUrl = process.env.DIRECT_URL;
if (!directUrl) throw new Error("DIRECT_URL est requis pour exécuter le seed.");
const adapter = new PrismaPg(directUrl);
const db = new PrismaClient({ adapter });

async function seedAdmin() {
  const identifier = process.env.SEED_ADMIN_IDENTIFIER ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Responsable";

  // Jamais de mot de passe par défaut : refuser sans SEED_ADMIN_PASSWORD explicite.
  if (!password || password.length < 8) {
    throw new Error(
      "SEED_ADMIN_PASSWORD manquant ou trop court (>= 8 caractères). Définissez-le avant le seed."
    );
  }

  const existing = await db.user.findUnique({ where: { identifier } });
  if (existing) {
    if (!existing.isSuperAdmin) {
      await db.user.update({ where: { id: existing.id }, data: { isSuperAdmin: true } });
      console.log(`L'utilisateur "${identifier}" existait déjà : marqué comme superadmin protégé.`);
    } else {
      console.log(`L'utilisateur "${identifier}" existe déjà, rien à faire.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { identifier, name, passwordHash, role: "ADMIN", isSuperAdmin: true },
  });

  console.log(`Compte admin créé : identifiant="${identifier}" (mot de passe non affiché).`);
  console.log("Ce compte est protégé (superadmin) : il ne peut pas être supprimé.");
}

async function seedStock() {
  // Ne rien faire s'il y a déjà des articles (base déjà utilisée).
  const count = await db.stockItem.count();
  if (count > 0) {
    console.log("Des articles de stock existent déjà, aucun produit ajouté.");
    return;
  }

  await db.stockItem.createMany({ data: REAL_INVENTORY });
  console.log(`${REAL_INVENTORY.length} produits du vrai inventaire ajoutés.`);
}

async function main() {
  await seedAdmin();
  await seedStock();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
