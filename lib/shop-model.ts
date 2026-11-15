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
  era: Era;
  category: Category;
  size: string;
  price: number;
  condition: Condition;
  colour: string | null;
  measurements: [label: string, cm: number][];
  status: ShopStatus;
  photos: string[];
  cutout: string | null;
  description: string | null;
  stylingTip: string | null;
};

export type ShopLook = { id: string; title: string; note: string | null; codes: string[]; source: "ai" | "team" };

export type ShopSettings = { whatsappNumber: string; dropName: string; deliveryFees: { area: string; fee: number }[]; details: ShopDetails; about: string };

export const SHOP_PRODUCT_COLUMNS =
  "code,name,brand,era,category,size,price_qar,condition,colour,measurements,status,photos,cutout,description,styling_tip" as const;

export type ShopProductRow = Pick<
  ProductRow,
  | "code" | "name" | "brand" | "era" | "category" | "size" | "price_qar" | "condition" | "colour"
  | "measurements" | "status" | "photos" | "cutout" | "description" | "styling_tip"
>;

// Hidden rows never reach the shop (RLS filters them), but a mapping bug must not show one either.
export function toShopProduct(row: ShopProductRow, publicUrl: (path: string) => string): ShopProduct | null {
  if (row.status === "hidden") return null;
  // The database won't let an incomplete product out of hidden (D-051); this guards the mapping all the same.
  if (!row.era || !row.category || !row.size || row.price_qar === null || !row.condition) return null;
  const m = row.measurements && typeof row.measurements === "object" && !Array.isArray(row.measurements) ? row.measurements : {};
  return {
    code: row.code,
    name: row.name,
    brand: row.brand,
    era: row.era as Era,
    category: row.category as Category,
    size: row.size,
    price: row.price_qar,
    condition: row.condition as Condition,
    colour: row.colour,
    measurements: Object.entries(m)
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .filter(([, v]) => Number.isFinite(v) && v > 0),
    status: row.status,
    photos: row.photos.map(publicUrl),
    cutout: row.cutout ? publicUrl(row.cutout) : null,
    description: row.description,
    stylingTip: row.styling_tip,
  };
}

const STATUS_ORDER: Record<ShopStatus, number> = { live: 0, reserved: 1, sold: 2 };

// Live first, then reserved, then sold. Newest code first within each group.
export function sortForShop(list: ShopProduct[]): ShopProduct[] {
  return [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || codeNumber(b.code) - codeNumber(a.code));
}

export function filterShop(list: ShopProduct[], f: { category: Category | "All"; hideSold: boolean }): ShopProduct[] {
  return list.filter((p) => (f.category === "All" || p.category === f.category) && !(f.hideSold && p.status === "sold"));
}

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
