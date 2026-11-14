import { describe, expect, it } from "vitest";
import { deliveryFee, lowestFee, orderBlocker, orderMessage, orderTotals, outfitMessage, type OrderForm } from "./order";
import { activeSlots, availableModes, initialOutfit, load, outfitPieces, pools, sanitize, shuffle, step } from "./outfit";
import { EMPTY_DETAILS } from "./shop-facts";
import type { ShopProduct, ShopSettings } from "./shop-model";

const settings: ShopSettings = {
  whatsappNumber: "97412345678", dropName: "Drop 07",
  deliveryFees: [{ area: "Al Sadd", fee: 15 }, { area: "Al Khor", fee: 25 }], details: EMPTY_DETAILS,
};
const items = [
  { code: "TQ-0709", name: "Sage V-neck sweater", size: "M", price: 120 },
  { code: "TQ-0716", name: "Rigid dark wash straight jeans", size: "W30", price: 140 },
];
const form = (over: Partial<OrderForm> = {}): OrderForm => ({ name: "Sara", mode: "delivery", area: "Al Khor", ...over });

describe("order", () => {
  it("uses the fee for the chosen area, free pickup, and no fee before an area is chosen", () => {
    expect(deliveryFee(settings, form())).toBe(25);
    expect(deliveryFee(settings, form({ mode: "pickup" }))).toBe(0);
    expect(deliveryFee(settings, form({ area: "" }))).toBeNull();
    expect(lowestFee(settings)).toBe(15);
    expect(lowestFee({ ...settings, deliveryFees: [] })).toBeNull();
  });

  it("adds up the subtotal and total", () => {
    expect(orderTotals(items, settings, form())).toEqual({ subtotal: 260, fee: 25, total: 285 });
  });

  it("says what's missing before sending", () => {
    expect(orderBlocker([], settings, form())).toBe("Add a piece to your bag first.");
    expect(orderBlocker(items, settings, form({ name: "  " }))).toBe("Add your name to send the order.");
    expect(orderBlocker(items, settings, form({ area: "" }))).toBe("Choose your area to send the order.");
    expect(orderBlocker(items, settings, form({ mode: "pickup", area: "" }))).toBeNull();
  });

  it("writes the delivery message exactly", () => {
    expect(orderMessage(items, settings, form())).toBe(
      "Hi Thriftesque! I'd like to order:\n\n" +
        "1. Sage V-neck sweater (size M), 120 QAR [TQ-0709]\n" +
        "2. Rigid dark wash straight jeans (size W30), 140 QAR [TQ-0716]\n\n" +
        "Subtotal: 260 QAR\nDelivery: 25 QAR\nTotal: 285 QAR\n\nName: Sara\nDeliver to: Al Khor",
    );
  });

  it("writes the pickup message", () => {
    const m = orderMessage(items, settings, form({ mode: "pickup" }));
    expect(m).toContain("Pickup: free\nTotal: 260 QAR");
    expect(m.endsWith("I'll pick up")).toBe(true);
  });

  it("asks about an outfit or a look", () => {
    expect(outfitMessage(items)).toMatch(/^Hi Thriftesque, is this outfit still available\?/);
    expect(outfitMessage(items, "Denim day")).toMatch(/^Hi Thriftesque, is this look still available\? \(Denim day\)/);
    expect(outfitMessage(items)).toMatch(/Total: 260 QAR$/);
  });
});

const p = (code: string, category: ShopProduct["category"], status: ShopProduct["status"] = "live", cutout = true) =>
  ({ code, name: code, category, status, cutout: cutout ? `c/${code}` : null, price: 100, size: "M" }) as ShopProduct;
const products = [
  p("T1", "Tops"), p("T2", "Knitwear"), p("T3", "Outerwear", "sold"), p("T4", "Tops", "live", false),
  p("B1", "Bottoms"), p("B2", "Bottoms", "reserved"), p("D1", "Dresses"), p("S1", "Shoes"), p("S2", "Shoes"),
];
const byCode = new Map(products.map((x) => [x.code, x]));
const pl = pools(products);
const seq = (...v: number[]) => () => v.shift() ?? 0;

describe("outfit pools and modes", () => {
  it("only uses live pieces with a cut-out", () => {
    expect(pl).toEqual({ top: ["T1", "T2"], dress: ["D1"], bottom: ["B1"], shoes: ["S1", "S2"] });
  });
  it("offers a mode only when its slots have pieces", () => {
    expect(availableModes(pl)).toEqual(["separates", "dress"]);
    expect(availableModes({ ...pl, top: [], bottom: [] })).toEqual(["dress"]);
    expect(initialOutfit({ top: [], dress: [], bottom: [], shoes: [] })).toBeNull();
  });
  it("works with only tops in stock: one Top slot to flip through (D-053)", () => {
    const tops = { top: ["T1", "T2"], dress: [], bottom: [], shoes: [] };
    expect(availableModes(tops)).toEqual(["separates"]);
    expect(activeSlots("separates", tops).map((s) => s.key)).toEqual(["top"]);
    expect(initialOutfit(tops)).toEqual({ mode: "separates", pick: { top: "T1" }, lock: {} });
    expect(activeSlots("separates", { ...tops, bottom: ["B1"] }).map((s) => s.key)).toEqual(["top", "bottom"]);
  });
  it("leaves out an empty slot", () => {
    expect(activeSlots("separates", { ...pl, shoes: [] }).map((s) => s.key)).toEqual(["top", "bottom"]);
  });
  it("starts with the newest piece in each slot", () => {
    expect(initialOutfit(pl)).toEqual({ mode: "separates", pick: { top: "T1", dress: "D1", bottom: "B1", shoes: "S1" }, lock: {} });
  });
});

describe("outfit actions", () => {
  const start = initialOutfit(pl)!;
  it("steps forward and back, wrapping round", () => {
    const a = step(start, pl, "top", 1);
    expect(a.pick.top).toBe("T2");
    expect(step(a, pl, "top", 1).pick.top).toBe("T1");
    expect(step(start, pl, "top", -1).pick.top).toBe("T2");
  });
  it("shuffles unlocked slots only and never repeats the current piece", () => {
    const locked = { ...start, lock: { top: true } };
    const { state, moved } = shuffle(locked, pl, seq(0, 0, 0));
    expect(state.pick.top).toBe("T1");
    expect(moved).toEqual(["bottom", "shoes"]);
    expect(state.pick.shoes).toBe("S2"); // rand picked S1 again, so it moved on
  });
  it("loads a look: switches mode, places and locks its pieces", () => {
    const { state, moved } = load(start, pl, [byCode.get("D1")!, byCode.get("S2")!], false);
    expect(state.mode).toBe("dress");
    expect(state.pick).toMatchObject({ dress: "D1", shoes: "S2" });
    expect(state.lock).toEqual({ dress: true, shoes: true });
    expect(moved).toEqual(["dress", "shoes"]);
    expect(outfitPieces(state, pl, byCode).map((x) => x.code)).toEqual(["D1", "S2"]);
  });
  it("ignores pieces that can't be dressed up", () => {
    const { state, moved } = load(start, pl, [byCode.get("T3")!, byCode.get("T4")!], true);
    expect(moved).toEqual([]);
    expect(state.pick.top).toBe("T1");
  });
  it("replaces a picked piece that sold since", () => {
    const stale = { ...start, pick: { ...start.pick, top: "T3" } };
    expect(sanitize(stale, pl).pick.top).toBe("T1");
  });
});

import { EMPTY_BAG, parseBag } from "./bag-store";

describe("parseBag", () => {
  it("reads a saved bag", () => {
    expect(parseBag(JSON.stringify({ codes: ["TQ-0701", "TQ-0702"], form: { name: "Sara", mode: "pickup", area: "" } })))
      .toEqual({ codes: ["TQ-0701", "TQ-0702"], form: { name: "Sara", mode: "pickup", area: "" } });
  });
  it("survives junk: bad JSON, bad codes, duplicates, unknown modes", () => {
    expect(parseBag("")).toEqual(EMPTY_BAG);
    expect(parseBag("{nope")).toEqual(EMPTY_BAG);
    const b = parseBag(JSON.stringify({ codes: ["TQ-0701", "TQ-0701", "<script>", 5], form: { mode: "teleport", name: 7 } }));
    expect(b.codes).toEqual(["TQ-0701"]);
    expect(b.form).toEqual({ name: "", mode: "delivery", area: "" });
  });
});
