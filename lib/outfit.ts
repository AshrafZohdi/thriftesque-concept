// Outfit builder rules (D-027): which pieces fit which slot, stepping, shuffling with locks, and loading a look or a piece.
// Pure and deterministic (randomness is passed in), so the rules are unit tested.
import type { Category } from "./catalog";
import type { ShopProduct } from "./shop-model";

export type SlotKey = "top" | "dress" | "bottom" | "shoes";
export type OutfitMode = "separates" | "dress";

export const SLOTS: { key: SlotKey; label: string; cats: Category[]; mode?: OutfitMode }[] = [
  { key: "top", label: "Top", cats: ["Tops", "Knitwear", "Outerwear"], mode: "separates" },
  { key: "dress", label: "Dress", cats: ["Dresses"], mode: "dress" },
  { key: "bottom", label: "Bottom", cats: ["Bottoms"], mode: "separates" },
  { key: "shoes", label: "Shoes", cats: ["Shoes"] },
];

export type Pools = Record<SlotKey, string[]>;
export type OutfitState = { mode: OutfitMode; pick: Partial<Record<SlotKey, string>>; lock: Partial<Record<SlotKey, boolean>> };

export const slotOf = (category: Category): SlotKey | undefined => SLOTS.find((s) => s.cats.includes(category))?.key;

// Only live pieces with a cut-out can be dressed up. Order follows the shop (newest first).
export function pools(products: ShopProduct[]): Pools {
  const out: Pools = { top: [], dress: [], bottom: [], shoes: [] };
  for (const p of products) {
    const k = slotOf(p.category);
    if (k && p.status === "live" && p.cutout) out[k].push(p.code);
  }
  return out;
}

// The builder works with whatever is in stock (D-053): only tops gives a single Top slot to flip through; add bottoms or
// shoes and their slots appear.
export function availableModes(pl: Pools): OutfitMode[] {
  const modes: OutfitMode[] = [];
  if (pl.top.length || pl.bottom.length) modes.push("separates");
  if (pl.dress.length) modes.push("dress");
  return modes;
}

export function activeSlots(mode: OutfitMode, pl: Pools) {
  return SLOTS.filter((s) => (!s.mode || s.mode === mode) && pl[s.key].length > 0);
}

// Starting outfit: the newest piece in each slot. Deterministic, so server and browser render the same thing.
export function initialOutfit(pl: Pools): OutfitState | null {
  const mode = availableModes(pl)[0];
  if (!mode) return null;
  const pick: OutfitState["pick"] = {};
  for (const s of SLOTS) if (pl[s.key][0]) pick[s.key] = pl[s.key][0];
  return { mode, pick, lock: {} };
}

// Drops picks that are no longer available (sold since) and refills those slots with the newest piece.
export function sanitize(state: OutfitState, pl: Pools): OutfitState {
  const pick = { ...state.pick };
  for (const s of SLOTS) if (!pick[s.key] || !pl[s.key].includes(pick[s.key]!)) pick[s.key] = pl[s.key][0];
  const modes = availableModes(pl);
  return { ...state, mode: modes.includes(state.mode) ? state.mode : modes[0] ?? state.mode, pick };
}

export function step(state: OutfitState, pl: Pools, key: SlotKey, dir: 1 | -1): OutfitState {
  const list = pl[key];
  if (!list.length) return state;
  const i = list.indexOf(state.pick[key] ?? "");
  return { ...state, pick: { ...state.pick, [key]: list[(i + dir + list.length) % list.length] } };
}

// Changes every unlocked slot that's on screen. Never repeats the current piece when there's another to choose.
export function shuffle(state: OutfitState, pl: Pools, rand: () => number = Math.random): { state: OutfitState; moved: SlotKey[] } {
  const pick = { ...state.pick };
  const moved: SlotKey[] = [];
  for (const s of activeSlots(state.mode, pl)) {
    if (state.lock[s.key]) continue;
    const list = pl[s.key];
    let next = list[Math.floor(rand() * list.length)];
    if (list.length > 1 && next === pick[s.key]) next = list[(list.indexOf(next) + 1) % list.length];
    pick[s.key] = next;
    moved.push(s.key);
  }
  return { state: { ...state, pick }, moved };
}

// Puts given pieces into their slots and locks them (a look's "Remix", or "Build an outfit with this").
export function load(state: OutfitState, pl: Pools, pieces: Pick<ShopProduct, "code" | "category">[], keepOtherLocks: boolean): { state: OutfitState; moved: SlotKey[] } {
  const pick = { ...state.pick };
  const lock: OutfitState["lock"] = keepOtherLocks ? { ...state.lock } : {};
  let mode = state.mode;
  const moved: SlotKey[] = [];
  for (const p of pieces) {
    const k = slotOf(p.category);
    if (!k || !pl[k].includes(p.code)) continue;
    const slot = SLOTS.find((s) => s.key === k)!;
    if (slot.mode) mode = slot.mode;
    pick[k] = p.code;
    lock[k] = true;
    moved.push(k);
  }
  return { state: { mode, pick, lock }, moved };
}

export function outfitPieces(state: OutfitState, pl: Pools, byCode: Map<string, ShopProduct>): ShopProduct[] {
  return activeSlots(state.mode, pl).map((s) => byCode.get(state.pick[s.key] ?? "")).filter((p): p is ShopProduct => !!p);
}
