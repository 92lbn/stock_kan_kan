// Inventaire réel du restaurant (importé depuis le fichier Excel fourni).
// quantity/minThreshold à 0 par défaut : à ajuster ensuite dans l'app.

export type Category =
  | "MENAGER_ENTRETIEN"
  | "EPICERIE"
  | "LEGUMES_FRAIS"
  | "BOISSONS"
  | "VIANDES_POISSONS"
  | "CONSOMMABLES_EMBALLAGES";

export type InventoryItem = {
  name: string;
  category: Category;
  unit: string;
  quantity: number;
  minThreshold: number;
};

function items(names: string[], category: Category): InventoryItem[] {
  return names.map((name) => ({ name, category, unit: "unité", quantity: 0, minThreshold: 0 }));
}

export const REAL_INVENTORY: InventoryItem[] = [
  ...items(
    [
      "Eponge",
      "Paille de fer",
      "Spray nettoyant",
      "Spray vitre",
      "Detergent sol",
      "Liquide vaisselle",
      "Savon main",
      "Vinaigre alimentaire",
      "Sac poubelle",
      "Gants",
      "Lavettes",
    ],
    "MENAGER_ENTRETIEN"
  ),
  ...items(
    [
      "Riz",
      "Graine de mil",
      "Farine",
      "Sucre",
      "Sucre vanille",
      "Sel",
      "Poivre",
      "Cumin",
      "Paprika",
      "Epice kankan",
      "Arome Maggi",
      "Pate d'arachide",
      "Concentre de tomate",
      "Sauce algerienne",
      "Sauce BBQ",
      "Ketchup",
      "Mayo",
      "Sauce sachet",
      "Peau de mayo",
      "Jumbo",
      "Adja",
      "Ail moulu",
      "Persil",
      "Menthe",
      "Jus ananas",
      "Lait concentre non sucre",
      "Jus citron",
      "Feuille de Bissap",
      "Thon",
    ],
    "EPICERIE"
  ),
  ...items(
    [
      "Manioc",
      "Carotte",
      "Chou",
      "Poivron",
      "Oignons blanc",
      "Oignons rouge",
      "Olive",
      "Patate",
      "Piment",
    ],
    "LEGUMES_FRAIS"
  ),
  ...items(
    [
      "Eau",
      "Ice Tea",
      "Oasis",
      "Perrier",
      "Orangina",
      "Dada rouge",
      "Dada zero",
      "Dada cherry",
      "Dada melon",
      "Dada lemon",
      "Dada mangue",
    ],
    "BOISSONS"
  ),
  ...items(
    ["Viande hachee", "Viande agneau", "Boeuf", "Brebis", "Poulet desosse", "Cuisse de poulet"],
    "VIANDES_POISSONS"
  ),
  ...items(
    [
      "Grand rouleau papier",
      "Papier toilette",
      "Cellophane",
      "Aluminium",
      "Sac plastique",
      "Sac papier client",
      "Sac congelation 3L",
      "Cornet frite",
      "Feuille plateau",
      "Pic brochette",
      "Cure-dents",
      "Paille",
      "Gobelet",
      "Serviette client",
      "Grand contenant",
      "Petit contenant",
      "Pot sauce (petit/grand)",
      "Rouleau etiqueteuse",
      "Rouleau imprimante",
      "Rouleau TPE",
    ],
    "CONSOMMABLES_EMBALLAGES"
  ),
];

// Noms des articles d'exemple précédemment ajoutés (placeholders), à retirer
// lors de l'import du vrai inventaire.
export const OLD_SAMPLE_NAMES = [
  "Riz",
  "Huile de tournesol",
  "Poulet",
  "Viande de bœuf",
  "Oignons",
  "Tomates",
  "Fleurs d'hibiscus (bissap)",
  "Gingembre",
  "Mangues",
  "Sel",
  "Savon liquide mains",
  "Gel hydroalcoolique",
  "Gants jetables",
  "Produit nettoyant sols",
  "Essuie-tout",
  "Dégraissant cuisine",
  "Sacs poubelle 100L",
  "Barquettes plastique",
  "Sacs kraft à emporter",
  "Gobelets carton",
  "Couvercles gobelets",
  "Bols carton",
  "Couverts jetables",
  "Serviettes en papier",
  "Bouteilles de Bissap",
];
