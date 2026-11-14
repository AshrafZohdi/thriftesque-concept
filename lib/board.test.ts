import { describe, expect, it } from "vitest";
import { boardLayout, type Spot } from "./board";
import type { Category } from "./catalog";

const look = (...cats: Category[]) => cats.map((category, i) => ({ code: `TQ-${i}`, category }));
// Overlap of two spots as a share of the smaller one (rotation ignored: it's a few degrees).
function overlap(a: Spot, b: Spot) {
  const w = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]));
  const h = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  return (w * h) / Math.min(a[2] * a[3], b[2] * b[3]);
}

describe("boardLayout (D-056)", () => {
  it("never puts two top-half pieces on each other", () => {
    for (const cats of [
      look("Tops", "Outerwear"), look("Tops", "Knitwear"), look("Knitwear", "Outerwear"),
      look("Tops", "Outerwear", "Bottoms"), look("Tops", "Knitwear", "Bottoms", "Shoes"), look("Tops", "Outerwear", "Shoes"),
    ]) {
      const spots = boardLayout(cats);
      const upper = cats.filter((p) => ["Tops", "Knitwear", "Outerwear"].includes(p.category)).map((p) => spots.get(p.code)!);
      expect(upper).toHaveLength(2);
      expect(overlap(upper[0], upper[1])).toBe(0);
    }
  });
  it("puts the jacket or knit on the right as the layer", () => {
    const spots = boardLayout(look("Outerwear", "Tops"));
    expect(spots.get("TQ-0")![0]).toBeGreaterThan(spots.get("TQ-1")![0]); // the jacket (TQ-0) sits right of the tee
  });
  it("keeps every piece on the board and the original layout for a single top", () => {
    for (const cats of [look("Tops", "Bottoms", "Shoes"), look("Dresses", "Outerwear", "Shoes"), look("Tops", "Knitwear", "Bottoms", "Shoes")]) {
      const spots = boardLayout(cats);
      expect(spots.size).toBe(cats.length);
      for (const [x, y, w, h] of spots.values()) expect(x >= 0 && y >= 0 && x + w <= 100 && y + h <= 100).toBe(true);
    }
    expect(boardLayout(look("Tops", "Bottoms")).get("TQ-0")).toEqual([4, 3, 56, 42, -5]);
  });
});
