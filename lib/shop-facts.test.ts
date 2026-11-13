import { describe, expect, it } from "vitest";
import { EMPTY_DETAILS, detailsFromRow, detailsToRow, missingDetails, shopFacts, validateDetails } from "./shop-facts";

describe("shopFacts", () => {
  it("marks empty details unconfirmed, keeping the approved wording for delivery and payment", () => {
    const f = shopFacts(EMPTY_DETAILS);
    expect(f.returns).toEqual({ text: "", confirmed: false });
    expect(f.delivery.confirmed).toBe(false);
    expect(f.delivery.text).toMatch(/^Across Qatar/);
  });
  it("uses what the team wrote, and counts it as confirmed", () => {
    const f = shopFacts({ ...EMPTY_DETAILS, returnsText: "  All sales are final. ", deliveryText: "Doha only." });
    expect(f.returns).toEqual({ text: "All sales are final.", confirmed: true });
    expect(f.delivery).toEqual({ text: "Doha only.", confirmed: true });
  });
  it("lists what's still missing, in form order", () => {
    expect(missingDetails({ ...EMPTY_DETAILS, contactEmail: "a@b.co" })).toEqual([
      "Who runs the shop", "Delivery", "Payment", "Returns and exchanges", "How long a reserved piece is held", "How long order chats are kept",
    ]);
    const full = Object.fromEntries(Object.keys(EMPTY_DETAILS).map((k) => [k, "x"])) as typeof EMPTY_DETAILS;
    expect(missingDetails(full)).toEqual([]);
  });
});

describe("validateDetails and the database mapping", () => {
  it("trims, replaces em dashes, and checks the email", () => {
    const r = validateDetails({ ...EMPTY_DETAILS, paymentText: " Cash — or transfer ", contactEmail: " hello@thriftesque.com " });
    expect(r).toMatchObject({ ok: true, value: { paymentText: "Cash, or transfer", contactEmail: "hello@thriftesque.com" } });
    expect(validateDetails({ ...EMPTY_DETAILS, contactEmail: "not an email" })).toMatchObject({ ok: false, error: expect.stringMatching(/^Contact email/) });
  });
  it("enforces the same limits as the database", () => {
    expect(validateDetails({ ...EMPTY_DETAILS, returnsText: "x".repeat(601) })).toMatchObject({ ok: false, error: "Returns and exchanges: 600 characters at most." });
    expect(validateDetails({ ...EMPTY_DETAILS, returnsText: "x".repeat(600) }).ok).toBe(true);
  });
  it("round-trips through the settings row", () => {
    const d = { ...EMPTY_DETAILS, operatorName: "Thriftesque", reservedHoldText: "24 hours" };
    expect(detailsFromRow(detailsToRow(d))).toEqual(d);
    expect(detailsFromRow(null)).toEqual(EMPTY_DETAILS);
  });
});
