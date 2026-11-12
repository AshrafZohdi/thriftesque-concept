import { describe, expect, it } from "vitest";
import seed from "../design/seed-products.json";
import { CATEGORIES, CONDITIONS, ERAS, MEASURE, STATUSES, codeNumber, formatCode } from "./catalog";
import { Constants } from "./database.types";

describe("product codes", () => {
  it("pads to four digits", () => {
    expect(formatCode(7)).toBe("TQ-0007");
    expect(formatCode(722)).toBe("TQ-0722");
    expect(formatCode(12345)).toBe("TQ-12345");
  });

  it("rejects non-positive or fractional numbers", () => {
    expect(() => formatCode(0)).toThrow(RangeError);
    expect(() => formatCode(1.5)).toThrow(RangeError);
  });

  it("round-trips and ignores malformed codes", () => {
    expect(codeNumber(formatCode(721))).toBe(721);
    expect(codeNumber("tq-0721")).toBe(0);
    expect(codeNumber("TQ-12")).toBe(0);
  });
});

describe("seed data matches the catalogue lists", () => {
  it.each(seed.map((p) => [p.code, p] as const))("%s", (_code, p) => {
    expect(CATEGORIES).toContain(p.category);
    expect(ERAS).toContain(p.era);
    expect(CONDITIONS).toContain(p.condition);
    const allowed = MEASURE[p.category as keyof typeof MEASURE];
    for (const key of Object.keys(p.measurements_cm)) expect(allowed).toContain(key);
  });
});

describe("app lists match the database", () => {
  it("statuses match the product_status enum", () => {
    expect([...STATUSES].sort()).toEqual([...Constants.public.Enums.product_status].sort());
  });
});
