// Where each piece sits on a look's 4:5 moodboard (D-028, D-056): x, y, width, height (%), rotation (deg). Picked from what's
// in the look, not by AI. A layered top half (a tee with a knit or jacket over it, D-053) gets two spots side by side, so the
// two never land on each other; the rest keeps the collage layout the boards always had.
import type { Category } from "./catalog";

export type Spot = readonly [x: number, y: number, w: number, h: number, r: number];
type Role = "top" | "base" | "layer" | "bottom" | "shoes" | "dress";

const LAYOUTS: Record<string, Partial<Record<Role, Spot>>> = {
  // one top-half piece (the original boards)
  "top": { top: [4, 3, 56, 42, -5], bottom: [44, 27, 52, 61, 4], shoes: [6, 62, 38, 30, -7] },
  // layered, on its own or with shoes
  "layered": { base: [3, 8, 47, 52, -5], layer: [50, 22, 47, 54, 4], shoes: [8, 66, 36, 28, -6] },
  // layered with a bottom (and maybe shoes)
  "layered+bottom": { base: [2, 2, 44, 36, -5], layer: [52, 2, 44, 38, 4], bottom: [30, 38, 44, 54, 2], shoes: [2, 66, 30, 28, -7] },
  "dress": { dress: [6, 4, 60, 82, -3], layer: [58, 4, 38, 44, 5], shoes: [58, 60, 38, 32, 7] },
};

const isLayer = (c: Category, all: Category[]) => c === "Outerwear" || (c === "Knitwear" && all.includes("Tops"));

export function boardLayout(pieces: { code: string; category: Category }[]): Map<string, Spot> {
  const cats = pieces.map((p) => p.category);
  const upper = pieces.filter((p) => p.category === "Tops" || p.category === "Knitwear" || p.category === "Outerwear");
  const dress = cats.includes("Dresses");
  const layered = !dress && upper.length >= 2;
  const layout = LAYOUTS[dress ? "dress" : layered ? (cats.includes("Bottoms") ? "layered+bottom" : "layered") : "top"];
  // In a layered pair the knit or jacket is the layer; if both are the same kind, the second one is.
  const layerCode = layered ? (upper.find((p) => isLayer(p.category, cats)) ?? upper[1]).code : null;
  const out = new Map<string, Spot>();
  for (const p of pieces) {
    const role: Role | undefined =
      p.category === "Dresses" ? "dress"
      : p.category === "Bottoms" ? "bottom"
      : p.category === "Shoes" ? "shoes"
      : upper.includes(p) ? (dress ? "layer" : layered ? (p.code === layerCode ? "layer" : "base") : "top")
      : undefined;
    const spot = role && layout[role];
    if (spot) out.set(p.code, spot);
  }
  return out;
}
