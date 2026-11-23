import { describe, expect, it, vi } from "vitest";
import { cleanSource, handleTally, isBot, parseEvent, type Recorder } from "./stats";

const order = { items: [{ code: "TQ-0001", price: 150 }, { code: "TQ-0002", price: 50 }], subtotal: 200, fee: 20, total: 220, mode: "delivery" };

describe("parseEvent", () => {
  it("keeps only the fields each count allows", () => {
    expect(parseEvent({ name: "order_sent", path: "/", props: { ...order, name: "Sara", area: "Lusail", phone: "5555" } })).toEqual({
      name: "order_sent", path: "/", props: order,
    });
    expect(parseEvent({ name: "page_view", path: "/about", props: { landing: true, source: "TikTok.com", extra: 1 } })).toEqual({
      name: "page_view", path: "/about", props: { landing: true, source: "tiktok.com" },
    });
    expect(parseEvent({ name: "ask_sent", path: "/p/TQ-0001", props: { kind: "piece", items: [{ code: "TQ-0001", price: 150, name: "x" }] } }))
      .toEqual({ name: "ask_sent", path: "/p/TQ-0001", props: { kind: "piece", items: [{ code: "TQ-0001", price: 150 }] } });
    expect(parseEvent({ name: "bag_add", path: "/", props: { codes: ["TQ-0001"] } })).toEqual({ name: "bag_add", path: "/", props: { codes: ["TQ-0001"] } });
    expect(parseEvent({ name: "product_view", path: "/p/TQ-0001", props: { code: "TQ-0001" } })?.props).toEqual({ code: "TQ-0001" });
  });

  it("drops query strings and fragments from the path", () => {
    expect(parseEvent({ name: "page_view", path: "/?q=my+name#x", props: {} })?.path).toBe("/");
  });

  it("refuses anything else", () => {
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent({ name: "sign_up", path: "/", props: {} })).toBeNull();
    expect(parseEvent({ name: "page_view", path: "https://evil.example/", props: {} })).toBeNull();
    expect(parseEvent({ name: "page_view", path: "//evil.example", props: {} })).toBeNull();
    expect(parseEvent({ name: "product_view", path: "/", props: { code: "DROP TABLE" } })).toBeNull();
    expect(parseEvent({ name: "bag_add", path: "/", props: { codes: [] } })).toBeNull();
    expect(parseEvent({ name: "order_sent", path: "/", props: { ...order, items: [] } })).toBeNull();
    expect(parseEvent({ name: "order_sent", path: "/", props: { ...order, total: -1 } })).toBeNull();
    expect(parseEvent({ name: "order_sent", path: "/", props: { ...order, mode: "drone" } })).toBeNull();
    expect(parseEvent({ name: "order_sent", path: "/", props: { ...order, items: [{ code: "TQ-0001", price: 1.5 }] } })).toBeNull();
    expect(parseEvent({ name: "ask_sent", path: "/", props: { kind: "chat", items: order.items } })).toBeNull();
    expect(parseEvent({ name: "bag_add", path: "/", props: { codes: Array.from({ length: 31 }, (_, i) => `TQ-${1000 + i}`) } })).toBeNull();
  });
});

describe("cleanSource and isBot", () => {
  it("keeps short site names only", () => {
    expect(cleanSource("www.Instagram.com")).toBe("instagram.com");
    expect(cleanSource("tiktok_ads")).toBe("tiktok_ads");
    expect(cleanSource("<script>")).toBeUndefined();
    expect(cleanSource("x".repeat(61))).toBeUndefined();
  });
  it("skips crawlers and link previews, not phones", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("WhatsApp/2.24.1 A")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_36.0")).toBe(false);
    expect(isBot("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 Instagram 350.0")).toBe(false);
  });
});

describe("handleTally", () => {
  const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
  const req = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("https://thriftesque.com/api/tally", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { origin: "https://thriftesque.com", "user-agent": PHONE, "cf-connecting-ip": "1.2.3.4", ...headers },
    });
  const view = { name: "product_view", path: "/p/TQ-0001", props: { code: "TQ-0001" } };

  it("records a valid count with the IP and browser as the fingerprint, and answers 204", async () => {
    const record = vi.fn<Recorder>().mockResolvedValue();
    const res = await handleTally(req(view), { enabled: true, record });
    expect(res.status).toBe(204);
    expect(record).toHaveBeenCalledWith(view, `1.2.3.4 ${PHONE}`);
  });

  it("records nothing when off, from another site, from a bot, too big or malformed, and still answers 204", async () => {
    const record = vi.fn<Recorder>().mockResolvedValue();
    const cases = [
      handleTally(req(view), { enabled: false, record }),
      handleTally(req(view, { origin: "https://evil.example" }), { enabled: true, record }),
      handleTally(new Request("https://thriftesque.com/api/tally", { method: "POST", body: JSON.stringify(view), headers: { "user-agent": PHONE } }), { enabled: true, record }),
      handleTally(req(view, { "user-agent": "Googlebot" }), { enabled: true, record }),
      handleTally(req({ ...view, pad: "x".repeat(5000) }), { enabled: true, record }),
      handleTally(req("{not json"), { enabled: true, record }),
      handleTally(req({ name: "nope", path: "/", props: {} }), { enabled: true, record }),
    ];
    for (const res of await Promise.all(cases)) expect(res.status).toBe(204);
    expect(record).not.toHaveBeenCalled();
  });

  it("still answers 204 when the database fails", async () => {
    const record = vi.fn<Recorder>().mockRejectedValue(new Error("down"));
    expect((await handleTally(req(view), { enabled: true, record })).status).toBe(204);
  });
});
