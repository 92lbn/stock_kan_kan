import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const db = new PrismaClient({ adapter });

async function seedAdmin() {
  const identifier = process.env.SEED_ADMIN_IDENTIFIER ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.SEED_ADMIN_NAME ?? "Responsable";

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

  console.log(`Compte admin créé : identifiant="${identifier}", mot de passe="${password}"`);
  console.log("Ce compte est protégé (superadmin) : il ne peut pas être supprimé.");
  console.log("Pensez à changer ce mot de passe après votre première connexion.");
}

const DEFAULT_RECIPES = [
  {
    title: "Bissap",
    category: "BOISSON" as const,
    ingredients: "Fleurs d'hibiscus séchées\nSucre\nEau\nMenthe fraîche\nEau de fleur d'oranger (optionnel)",
    steps:
      "Rincer les fleurs d'hibiscus\nFaire bouillir l'eau puis infuser les fleurs 15-20 min\nFiltrer\nAjouter le sucre selon le goût\nParfumer avec la menthe et l'eau de fleur d'oranger\nServir bien frais",
  },
  {
    title: "Jus de gingembre",
    category: "BOISSON" as const,
    ingredients: "Gingembre frais\nEau\nSucre ou miel\nJus de citron",
    steps:
      "Éplucher et mixer le gingembre avec un peu d'eau\nFiltrer pour récupérer le jus\nAllonger avec de l'eau\nSucrer et ajouter le citron\nServir frais",
  },
  {
    title: "Jus de mangue",
    category: "BOISSON" as const,
    ingredients: "Mangues mûres\nEau\nSucre\nJus de citron",
    steps:
      "Éplucher et découper les mangues\nMixer avec l'eau\nAjouter le sucre et le citron\nFiltrer si besoin\nServir bien frais",
  },
  {
    title: "Marinade brochettes de poulet",
    category: "MARINADE" as const,
    ingredients: "Blancs de poulet\nHuile\nAil\nGingembre\nPaprika\nSel, poivre\nJus de citron",
    steps:
      "Couper le poulet en cubes\nMélanger tous les ingrédients de la marinade\nEnrober le poulet\nLaisser mariner au moins 2h au frais\nMonter sur les brochettes",
  },
  {
    title: "Marinade brochettes de brebis",
    category: "MARINADE" as const,
    ingredients: "Viande de brebis\nHuile d'olive\nAil\nRomarin\nCumin\nSel, poivre",
    steps:
      "Couper la viande en cubes\nPréparer la marinade\nEnrober la viande\nLaisser mariner au moins 3h au frais\nMonter sur les brochettes",
  },
  {
    title: "Marinade brochettes de bœuf",
    category: "MARINADE" as const,
    ingredients: "Viande de bœuf\nSauce soja\nAil\nGingembre\nHuile\nPoivre",
    steps:
      "Couper la viande en cubes\nMélanger la marinade\nEnrober la viande\nLaisser mariner 2h au frais\nMonter sur les brochettes",
  },
  {
    title: "Marinade brochettes d'agneau",
    category: "MARINADE" as const,
    ingredients: "Viande d'agneau\nHuile d'olive\nAil\nMenthe\nCumin\nCoriandre\nSel, poivre",
    steps:
      "Couper la viande en cubes\nPréparer la marinade aux herbes et épices\nEnrober la viande\nLaisser mariner au moins 3h au frais\nMonter sur les brochettes",
  },
];

async function seedRecipes() {
  const count = await db.recipe.count();
  if (count > 0) {
    console.log("Des recettes existent déjà, aucune recette par défaut ajoutée.");
    return;
  }

  await db.recipe.createMany({ data: DEFAULT_RECIPES });
  console.log(`${DEFAULT_RECIPES.length} recettes par défaut ajoutées (boissons + marinades).`);
}

async function main() {
  await seedAdmin();
  await seedRecipes();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
