// Pure dashboard logic: stats, search and status tabs, and settings validation. Unit tested.
import { STATUSES, type Status } from "./catalog";
import { EMPTY_DETAILS, validateDetails, type ShopDetails } from "./shop-facts";

export type TeamProduct = {
  code: string; name: string; brand: string; era: string; category: string; size: string; price_qar: number;
  status: Status; photos: string[]; cutout?: string | null; created_at: string; sold_at: string | null;
};

const DAY = 86_400_000;

export function dashboardStats(list: TeamProduct[]) {
  const by = (s: Status) => list.filter((p) => p.status === s);
  const sold = by("sold");
  const sum = (a: TeamProduct[]) => a.reduce((t, p) => t + p.price_qar, 0);
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

export type SettingsInput = { whatsappNumber: string; dropName: string; deliveryFees: { area: string; fee: number }[]; details: ShopDetails };

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
  return { ok: true, value: { whatsappNumber, dropName, deliveryFees: fees, details: details.value } };
}
