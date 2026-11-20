// Shop search (D-064): what a shopper types, matched against each piece. Every word has to match (so "black bag" narrows),
// each as the start of a word in the piece's name, brand, category, colour, era, size, code, sections or description.
// Everyday words find their category too ("jeans", "tote", "jumper"), and "sale" finds pieces with a was price.
import type { ShopProduct } from "./shop-model";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Plural and singular match each other: "bags" finds "bag", "dresses" finds "dress".
const stem = (w: string) => {
  if (w.length > 5 && w.endsWith("sses")) return w.slice(0, -2); // dresses, glasses
  if (w.length > 4 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -2); // shoes, boxes
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1); // bags, jeans, blouses
  return w;
};

// General words shoppers use for a whole category, as stems. Specific garments (jeans, skirt, tote, boots) aren't here: they
// must be in the piece itself, so "jeans" doesn't bring up skirts.
const CATEGORY_WORDS: Record<string, string[]> = {
  Outerwear: ["jacket", "coat", "outerwear"],
  Knitwear: ["sweater", "jumper", "knitwear"],
  Tops: ["top"],
  Bottoms: ["bottom", "pant", "trouser"],
  Dresses: ["dress"],
  Shoes: ["shoe", "footwear"],
  Bags: ["bag", "handbag", "purse"],
};

export function searchWords(query: string): string[] {
  return norm(query).split(" ").filter(Boolean).map(stem);
}

export type Searchable = Pick<ShopProduct, "name" | "brand" | "category" | "colour" | "era" | "size" | "code" | "description" | "wasPrice" | "sections">;

// How well a piece matches: 0 is no match. Per word: its own details (name, brand, colour, sections...) 3, a category word 2,
// only the description 1. So the obvious results come first.
export function searchScore(p: Searchable, words: string[], sectionNames: Map<string, string>): number {
  if (!words.length) return 1;
  const strong = norm([p.name, p.brand, p.category ?? "", p.colour ?? "", p.era ?? "", p.size ?? "", p.code, ...p.sections.map((id) => sectionNames.get(id) ?? "")].join(" ")).split(" ").map(stem);
  const weak = norm(p.description ?? "").split(" ").map(stem);
  const has = (list: string[], w: string) => list.some((x) => x.startsWith(w));
  let score = 0;
  for (const w of words) {
    if (has(strong, w) || (w === "sale" && p.wasPrice !== null)) score += 3;
    else if (p.category && CATEGORY_WORDS[p.category]?.some((c) => c.startsWith(w) || w.startsWith(c))) score += 2;
    else if (has(weak, w)) score += 1;
    else return 0;
  }
  return score;
}

// The matching pieces, best first; ties keep the shop's order.
export function searchShop<T extends Searchable>(list: T[], query: string, sectionNames: Map<string, string>): T[] {
  const words = searchWords(query);
  if (!words.length) return list;
  return list
    .map((p, i) => ({ p, i, s: searchScore(p, words, sectionNames) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
}
