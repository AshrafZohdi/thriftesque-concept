// Pure shop logic: turning database rows into what the shop shows, ordering, filtering and which looks can be shown.
import type { ShopDetails } from "./shop-facts";
import { CATEGORIES, codeNumber, type Category, type Condition, type Era } from "./catalog";
import type { Database } from "./database.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type LookRow = Database["public"]["Tables"]["looks"]["Row"];

export type ShopStatus = "live" | "reserved" | "sold";

export type ShopProduct = {
  code: string;
  name: string;
  brand: string;
  // Optional since D-066: the team can put a piece live with only a name, a photo and a price.
  era: Era | null;
  category: Category | null;
  size: string | null;
  price: number;
  // The price before a reduction, or null when the piece isn't on sale (D-060).
  wasPrice: number | null;
  condition: Condition | null;
  colour: string | null;
  measurements: [label: string, cm: number][];
  status: ShopStatus;
  photos: string[];
  cutout: string | null;
  description: string | null;
  stylingTip: string | null;
  sections: string[];
};

export type ShopSection = { id: string; name: string };

// Joins the details a piece has, skipping missing ones (D-066): "Unbranded · 90s · Good", or just "Unbranded".
export const joinDetails = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");

export type AboutPhoto = { path: string; alt: string };

export type ShopLook = { id: string; title: string; note: string | null; codes: string[]; source: "ai" | "team" };

export type ShopSettings = { whatsappNumber: string; dropName: string; deliveryFees: { area: string; fee: number }[]; details: ShopDetails; about: string; aboutPhotos: AboutPhoto[] };

export const SHOP_PRODUCT_COLUMNS =
  "code,name,brand,era,category,size,price_qar,was_price_qar,condition,colour,measurements,status,photos,cutout,description,styling_tip,section_ids" as const;

export type ShopProductRow = Pick<
  ProductRow,
  | "code" | "name" | "brand" | "era" | "category" | "size" | "price_qar" | "was_price_qar" | "condition" | "colour"
  | "measurements" | "status" | "photos" | "cutout" | "description" | "styling_tip" | "section_ids"
>;

// Hidden rows never reach the shop (RLS filters them), but a mapping bug must not show one either.
export function toShopProduct(row: ShopProductRow, publicUrl: (path: string) => string): ShopProduct | null {
  if (row.status === "hidden") return null;
  // The database won't let a piece without a price out of hidden (D-066); this guards the mapping all the same.
  if (row.price_qar === null || !row.photos.length) return null;
  const m = row.measurements && typeof row.measurements === "object" && !Array.isArray(row.measurements) ? row.measurements : {};
  return {
    code: row.code,
    name: row.name,
    brand: row.brand,
    era: (row.era as Era | null) || null,
    category: (row.category as Category | null) || null,
    size: row.size || null,
    price: row.price_qar,
    wasPrice: row.was_price_qar !== null && row.was_price_qar > row.price_qar ? row.was_price_qar : null,
    condition: (row.condition as Condition | null) || null,
    colour: row.colour,
    measurements: Object.entries(m)
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .filter(([, v]) => Number.isFinite(v) && v > 0),
    status: row.status,
    photos: row.photos.map(publicUrl),
    cutout: row.cutout ? publicUrl(row.cutout) : null,
    description: row.description,
    stylingTip: row.styling_tip,
    sections: row.section_ids,
  };
}

const STATUS_ORDER: Record<ShopStatus, number> = { live: 0, reserved: 1, sold: 2 };

// Live first, then reserved, then sold. Newest code first within each group.
export function sortForShop(list: ShopProduct[]): ShopProduct[] {
  return [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || codeNumber(b.code) - codeNumber(a.code));
}

// The section filter: "" for everything, SALE for pieces on sale, or a team section's id (D-060).
export const SALE = "sale";

const inSection = (p: ShopProduct, section: string) => !section || (section === SALE ? p.wasPrice !== null : p.sections.includes(section));

export function filterShop(list: ShopProduct[], f: { category: Category | "All"; hideSold: boolean; section?: string }): ShopProduct[] {
  return list.filter((p) => (f.category === "All" || p.category === f.category) && !(f.hideSold && p.status === "sold") && inSection(p, f.section ?? ""));
}

// Section chips: Sale while a live piece is on sale, then the team's sections that have a piece in the shop, in their order.
// The number on each chip is how many are live.
export function sectionChips(list: ShopProduct[], sections: ShopSection[]): { id: string; name: string; live: number }[] {
  const live = (id: string) => list.filter((p) => p.status === "live" && inSection(p, id)).length;
  return [
    ...(live(SALE) ? [{ id: SALE, name: "Sale", live: live(SALE) }] : []),
    ...sections.filter((s) => list.some((p) => p.sections.includes(s.id))).map((s) => ({ id: s.id, name: s.name, live: live(s.id) })),
  ];
}

// "30% off", rounded down so it never overstates the saving. Whole-number maths: 1 - 320 / 400 in floating point gave 19.
export const percentOff = (p: Pick<ShopProduct, "price" | "wasPrice">) => (p.wasPrice ? Math.floor(((p.wasPrice - p.price) * 100) / p.wasPrice) : 0);

// Categories that have any piece in the shop, with how many are live (the number on each chip).
export function categoryChips(list: ShopProduct[]): { category: Category | "All"; live: number }[] {
  const live = (c: Category | "All") => list.filter((p) => p.status === "live" && (c === "All" || p.category === c)).length;
  return [
    { category: "All" as const, live: live("All") },
    ...CATEGORIES.filter((c) => list.some((p) => p.category === c)).map((c) => ({ category: c, live: live(c) })),
  ];
}

// A look shows only while every piece is live and has a cut-out (D-028).
export function visibleLooks(looks: ShopLook[], byCode: Map<string, ShopProduct>): ShopLook[] {
  return looks.filter((l) => l.codes.length >= 2 && l.codes.every((c) => {
    const p = byCode.get(c);
    return p?.status === "live" && !!p.cutout;
  }));
}

export function toShopLook(row: Pick<LookRow, "id" | "title" | "note" | "product_codes" | "source">): ShopLook {
  return { id: row.id, title: row.title, note: row.note, codes: row.product_codes, source: row.source };
}
