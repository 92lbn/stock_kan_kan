import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const db = new PrismaClient({ adapter });

async function main() {
  const identifier = process.env.SEED_ADMIN_IDENTIFIER ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.SEED_ADMIN_NAME ?? "Responsable";

  const existing = await db.user.findUnique({ where: { identifier } });
  if (existing) {
    console.log(`L'utilisateur "${identifier}" existe déjà, rien à faire.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { identifier, name, passwordHash, role: "ADMIN" },
  });

  console.log(`Compte admin créé : identifiant="${identifier}", mot de passe="${password}"`);
  console.log("Pensez à changer ce mot de passe après votre première connexion.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
