export type SearchableStockItem = {
  name: string;
  category: string;
  barcode: string;
};

export function normalizeStockSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function searchStockItems<T extends SearchableStockItem>(items: T[], query: string) {
  const terms = normalizeStockSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const haystack = normalizeStockSearch(`${item.name} ${item.category} ${item.barcode}`);
    return terms.every((term) => haystack.includes(term));
  });
}
