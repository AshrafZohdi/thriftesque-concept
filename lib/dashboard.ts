// Pure dashboard logic: stats, search and status tabs, and settings validation. Unit tested.
import { STATUSES, type Status } from "./catalog";
import { validateAbout, validateAboutPhotos } from "./about";
import type { AboutPhoto } from "./shop-model";
import { EMPTY_DETAILS, validateDetails, type ShopDetails } from "./shop-facts";

// Hidden drafts from a bulk upload can be missing these until the team fills them in (D-051).
export type TeamProduct = {
  code: string; name: string; brand: string; era: string | null; category: string | null; size: string | null; price_qar: number | null;
  was_price_qar?: number | null; section_ids?: string[]; condition?: string | null; status: Status; photos: string[]; cutout?: string | null; created_at: string; sold_at: string | null;
};

// What a product still needs before it can be live, reserved or sold: a price and a photo (D-066; size, category, era and
// condition are optional). Empty means ready. The database enforces the same rule.
export function missingForShop(p: Pick<TeamProduct, "price_qar" | "photos">): string[] {
  return [p.price_qar === null || p.price_qar === undefined ? "price" : "", p.photos.length ? "" : "a photo"].filter(Boolean);
}

const DAY = 86_400_000;

export function dashboardStats(list: TeamProduct[]) {
  const by = (s: Status) => list.filter((p) => p.status === s);
  const sold = by("sold");
  const sum = (a: TeamProduct[]) => a.reduce((t, p) => t + (p.price_qar ?? 0), 0);
  const days = sold
    .filter((p) => p.sold_at)
    .map((p) => (Date.parse(p.sold_at!) - Date.parse(p.created_at)) / DAY)
    .filter((d) => Number.isFinite(d) && d >= 0);
  return {
    live: by("live").length,
    reserved: by("reserved").length,
    sold: sold.length,
    hidden: by("hidden").length,
    salesTotal: sum(sold),
    liveValue: sum(by("live")),
    avgDaysToSell: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
  };
}

export function searchProducts(list: TeamProduct[], query: string, tab: Status | "all"): TeamProduct[] {
  const q = query.trim().toLowerCase();
  return list.filter((p) => (tab === "all" || p.status === tab) && (!q || `${p.name} ${p.brand} ${p.code}`.toLowerCase().includes(q)));
}

export const isStatus = (v: unknown): v is Status => typeof v === "string" && (STATUSES as readonly string[]).includes(v);
export const isCode = (v: unknown): v is string => typeof v === "string" && /^TQ-\d{4,}$/.test(v);

export type SettingsInput = {
  whatsappNumber: string; dropName: string; deliveryFees: { area: string; fee: number }[]; details: ShopDetails; about: string; aboutPhotos: AboutPhoto[];
};

// Returns cleaned settings, or the first problem in plain words.
export function validateSettings(input: SettingsInput): { ok: true; value: SettingsInput } | { ok: false; error: string } {
  const whatsappNumber = String(input.whatsappNumber ?? "").replace(/[\s+()-]/g, "");
  if (whatsappNumber && !/^\d{8,15}$/.test(whatsappNumber))
    return { ok: false, error: "WhatsApp number: digits only, country code first, for example 97455551234." };
  const dropName = String(input.dropName ?? "").trim();
  if (dropName.length > 40) return { ok: false, error: "Drop name: 40 characters at most." };
  const fees = (input.deliveryFees ?? []).map((f) => ({ area: String(f.area ?? "").trim(), fee: Number(f.fee) }));
  if (fees.length > 40) return { ok: false, error: "Delivery areas: 40 at most." };
  const seen = new Set<string>();
  for (const f of fees) {
    if (!f.area || f.area.length > 40) return { ok: false, error: "Every delivery area needs a name (40 characters at most)." };
    if (seen.has(f.area.toLowerCase())) return { ok: false, error: `"${f.area}" is listed twice.` };
    seen.add(f.area.toLowerCase());
    if (!Number.isInteger(f.fee) || f.fee < 0 || f.fee > 1000) return { ok: false, error: `Fee for ${f.area}: a whole number of QAR from 0 to 1000.` };
  }
  const details = validateDetails(input.details ?? EMPTY_DETAILS);
  if (!details.ok) return details;
  const about = validateAbout(input.about);
  if (!about.ok) return about;
  const aboutPhotos = validateAboutPhotos(input.aboutPhotos);
  if (!aboutPhotos.ok) return aboutPhotos;
  return { ok: true, value: { whatsappNumber, dropName, deliveryFees: fees, details: details.value, about: about.value, aboutPhotos: aboutPhotos.value } };
}

// Team-made sections (D-060), in shop order. A new one has no id yet.
export type SectionInput = { id?: string; name: string };
export const SECTIONS_MAX = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateSections(input: SectionInput[]): { ok: true; value: SectionInput[] } | { ok: false; error: string } {
  const list = Array.isArray(input) ? input : [];
  if (list.length > SECTIONS_MAX) return { ok: false, error: `${SECTIONS_MAX} sections at most.` };
  const seen = new Set<string>();
  const value: SectionInput[] = [];
  for (const s of list) {
    const name = String(s?.name ?? "").replace(/\s+/g, " ").trim();
    if (!name || name.length > 30) return { ok: false, error: "Every section needs a name (30 characters at most)." };
    if (seen.has(name.toLowerCase())) return { ok: false, error: `"${name}" is listed twice.` };
    seen.add(name.toLowerCase());
    if (s.id !== undefined && !UUID.test(s.id)) return { ok: false, error: "That section isn't valid. Refresh the page." };
    value.push(s.id ? { id: s.id, name } : { name });
  }
  return { ok: true, value };
}
