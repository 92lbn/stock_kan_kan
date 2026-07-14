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

const DEFAULT_STOCK: {
  name: string;
  category: "ALIMENTAIRE" | "HYGIENE" | "EMBALLAGE" | "CONSOMMABLES" | "MATERIEL_INFORMATIQUE";
  unit: string;
  quantity: number;
  minThreshold: number;
}[] = [
  // Alimentaire
  { name: "Riz", category: "ALIMENTAIRE", unit: "sac 25kg", quantity: 4, minThreshold: 2 },
  { name: "Huile de tournesol", category: "ALIMENTAIRE", unit: "bidon 5L", quantity: 6, minThreshold: 3 },
  { name: "Poulet", category: "ALIMENTAIRE", unit: "kg", quantity: 20, minThreshold: 10 },
  { name: "Viande de bœuf", category: "ALIMENTAIRE", unit: "kg", quantity: 15, minThreshold: 8 },
  { name: "Oignons", category: "ALIMENTAIRE", unit: "sac 10kg", quantity: 3, minThreshold: 2 },
  { name: "Tomates", category: "ALIMENTAIRE", unit: "cageot", quantity: 5, minThreshold: 2 },
  { name: "Fleurs d'hibiscus (bissap)", category: "ALIMENTAIRE", unit: "sachet 1kg", quantity: 4, minThreshold: 2 },
  { name: "Gingembre", category: "ALIMENTAIRE", unit: "kg", quantity: 3, minThreshold: 1 },
  { name: "Mangues", category: "ALIMENTAIRE", unit: "cageot", quantity: 2, minThreshold: 1 },
  { name: "Sel", category: "ALIMENTAIRE", unit: "paquet 5kg", quantity: 4, minThreshold: 2 },
  // Hygiène
  { name: "Savon liquide mains", category: "HYGIENE", unit: "bidon 5L", quantity: 3, minThreshold: 2 },
  { name: "Gel hydroalcoolique", category: "HYGIENE", unit: "flacon 1L", quantity: 6, minThreshold: 3 },
  { name: "Gants jetables", category: "HYGIENE", unit: "boîte 100", quantity: 8, minThreshold: 4 },
  { name: "Produit nettoyant sols", category: "HYGIENE", unit: "bidon 5L", quantity: 4, minThreshold: 2 },
  { name: "Essuie-tout", category: "HYGIENE", unit: "lot 6 rouleaux", quantity: 10, minThreshold: 4 },
  { name: "Dégraissant cuisine", category: "HYGIENE", unit: "spray 750ml", quantity: 5, minThreshold: 2 },
  { name: "Sacs poubelle 100L", category: "HYGIENE", unit: "rouleau 25", quantity: 6, minThreshold: 3 },
  // Emballage
  { name: "Barquettes plastique", category: "EMBALLAGE", unit: "carton 500", quantity: 4, minThreshold: 2 },
  { name: "Sacs kraft à emporter", category: "EMBALLAGE", unit: "paquet 250", quantity: 5, minThreshold: 2 },
  { name: "Gobelets carton", category: "EMBALLAGE", unit: "sleeve 100", quantity: 12, minThreshold: 5 },
  { name: "Couvercles gobelets", category: "EMBALLAGE", unit: "sleeve 100", quantity: 12, minThreshold: 5 },
  { name: "Bols carton", category: "EMBALLAGE", unit: "carton 300", quantity: 3, minThreshold: 2 },
  { name: "Couverts jetables", category: "EMBALLAGE", unit: "boîte 250", quantity: 6, minThreshold: 3 },
  { name: "Serviettes en papier", category: "EMBALLAGE", unit: "carton 1000", quantity: 4, minThreshold: 2 },
];

async function seedStock() {
  let added = 0;
  for (const item of DEFAULT_STOCK) {
    const existing = await db.stockItem.findFirst({ where: { name: item.name } });
    if (existing) continue;
    await db.stockItem.create({ data: item });
    added++;
  }
  if (added > 0) {
    console.log(`${added} articles de stock d'exemple ajoutés (alimentaire, hygiène, emballage).`);
  } else {
    console.log("Articles de stock d'exemple déjà présents, rien à ajouter.");
  }
}

async function main() {
  await seedAdmin();
  await seedRecipes();
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
