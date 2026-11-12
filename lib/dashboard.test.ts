import { describe, expect, it } from "vitest";
import { dashboardStats, isCode, isStatus, searchProducts, validateSettings, type TeamProduct } from "./dashboard";

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
    const r = validateSettings({ whatsappNumber: "+974 5555 1234", dropName: " Drop 08 ", deliveryFees: [{ area: " Lusail ", fee: 15 }] });
    expect(r).toEqual({ ok: true, value: { whatsappNumber: "97455551234", dropName: "Drop 08", deliveryFees: [{ area: "Lusail", fee: 15 }] } });
  });
  it("rejects bad settings with a plain message", () => {
    expect(validateSettings({ whatsappNumber: "5555", dropName: "", deliveryFees: [] })).toMatchObject({ ok: false, error: expect.stringMatching(/^WhatsApp number/) });
    expect(validateSettings({ whatsappNumber: "", dropName: "", deliveryFees: [{ area: "A", fee: 1 }, { area: "a", fee: 2 }] })).toMatchObject({ ok: false, error: '"a" is listed twice.' });
    expect(validateSettings({ whatsappNumber: "", dropName: "", deliveryFees: [{ area: "A", fee: 1.5 }] })).toMatchObject({ ok: false });
    expect(validateSettings({ whatsappNumber: "", dropName: "", deliveryFees: [{ area: "", fee: 1 }] })).toMatchObject({ ok: false });
  });
});
