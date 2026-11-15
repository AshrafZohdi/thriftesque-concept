import { describe, expect, it } from "vitest";
import { EMPTY_DETAILS } from "./shop-facts";
import { dashboardStats, isCode, isStatus, searchProducts, validateSections, validateSettings, type TeamProduct } from "./dashboard";

const p = (code: string, status: TeamProduct["status"], price: number, created: string, sold: string | null = null): TeamProduct =>
  ({ code, name: `Piece ${code}`, brand: "Unbranded", era: "90s", category: "Tops", size: "M", price_qar: price, status, photos: [], created_at: created, sold_at: sold });

const list = [
  p("TQ-0001", "live", 100, "2026-11-01T00:00:00Z"),
  p("TQ-0002", "live", 50, "2026-11-01T00:00:00Z"),
  p("TQ-0003", "sold", 200, "2026-11-01T00:00:00Z", "2026-11-04T00:00:00Z"),
  p("TQ-0004", "sold", 80, "2026-11-01T00:00:00Z", "2026-11-02T12:00:00Z"),
  p("TQ-0005", "reserved", 70, "2026-11-01T00:00:00Z"),
  p("TQ-0006", "hidden", 90, "2026-11-01T00:00:00Z"),
];

describe("dashboardStats", () => {
  it("counts, sums and averages days to sell", () => {
    expect(dashboardStats(list)).toEqual({ live: 2, reserved: 1, sold: 2, hidden: 1, salesTotal: 280, liveValue: 150, avgDaysToSell: 2.3 });
  });
  it("has no average before anything sells", () => {
    expect(dashboardStats(list.filter((x) => x.status !== "sold")).avgDaysToSell).toBeNull();
  });
});

describe("searchProducts", () => {
  it("matches name, brand or code, within a tab", () => {
    expect(searchProducts(list, "0003", "all").map((x) => x.code)).toEqual(["TQ-0003"]);
    expect(searchProducts(list, "", "sold")).toHaveLength(2);
    expect(searchProducts(list, "unbranded", "hidden").map((x) => x.code)).toEqual(["TQ-0006"]);
  });
});

describe("input checks", () => {
  it("knows statuses and codes", () => {
    expect(isStatus("reserved")).toBe(true);
    expect(isStatus("deleted")).toBe(false);
    expect(isCode("TQ-0722")).toBe(true);
    expect(isCode("TQ-0722; drop table")).toBe(false);
  });
  it("cleans and accepts good settings", () => {
    const r = validateSettings({ whatsappNumber: "+974 5555 1234", dropName: " Drop 08 ", deliveryFees: [{ area: " Lusail ", fee: 15 }], details: EMPTY_DETAILS, about: " Our story ", aboutPhotos: [{ path: "a/x-1.webp", alt: "  Model in the denim jacket " }] });
    expect(r).toEqual({ ok: true, value: { whatsappNumber: "97455551234", dropName: "Drop 08", deliveryFees: [{ area: "Lusail", fee: 15 }], details: EMPTY_DETAILS, about: "Our story", aboutPhotos: [{ path: "a/x-1.webp", alt: "Model in the denim jacket" }] } });
  });
  it("rejects bad settings with a plain message", () => {
    expect(validateSettings({ whatsappNumber: "5555", dropName: "", deliveryFees: [], details: EMPTY_DETAILS, about: "", aboutPhotos: [] })).toMatchObject({ ok: false, error: expect.stringMatching(/^WhatsApp number/) });
    expect(validateSettings({ whatsappNumber: "", dropName: "", deliveryFees: [{ area: "A", fee: 1 }, { area: "a", fee: 2 }], details: EMPTY_DETAILS, about: "", aboutPhotos: [] })).toMatchObject({ ok: false, error: '"a" is listed twice.' });
    expect(validateSettings({ whatsappNumber: "", dropName: "", deliveryFees: [{ area: "A", fee: 1.5 }], details: EMPTY_DETAILS, about: "", aboutPhotos: [] })).toMatchObject({ ok: false });
    expect(validateSettings({ whatsappNumber: "", dropName: "", deliveryFees: [{ area: "", fee: 1 }], details: EMPTY_DETAILS, about: "", aboutPhotos: [] })).toMatchObject({ ok: false });
  });
});

describe("sections and about photos (D-060)", () => {
  const base = { whatsappNumber: "", dropName: "", deliveryFees: [], details: EMPTY_DETAILS, about: "" };
  it("refuses about photos that didn't come from the uploader, or too many", () => {
    expect(validateSettings({ ...base, aboutPhotos: [{ path: "p/x.webp", alt: "" }] })).toMatchObject({ ok: false });
    expect(validateSettings({ ...base, aboutPhotos: Array.from({ length: 9 }, (_, i) => ({ path: `a/x${i}.webp`, alt: "" })) })).toMatchObject({ ok: false, error: "About photos: 8 at most." });
  });
  it("cleans section names and refuses duplicates and blanks", () => {
    expect(validateSections([{ name: "  Men's   wear " }, { id: "6f1c2b8e-3d4a-4b5c-9d6e-7f8091a2b3c4", name: "Basics" }])).toEqual({
      ok: true, value: [{ name: "Men's wear" }, { id: "6f1c2b8e-3d4a-4b5c-9d6e-7f8091a2b3c4", name: "Basics" }],
    });
    expect(validateSections([{ name: "Bags" }, { name: "bags" }])).toEqual({ ok: false, error: '"bags" is listed twice.' });
    expect(validateSections([{ name: " " }])).toMatchObject({ ok: false });
    expect(validateSections([{ id: "nope", name: "Bags" }])).toMatchObject({ ok: false });
  });
});
