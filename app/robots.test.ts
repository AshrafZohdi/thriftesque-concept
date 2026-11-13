import { afterEach, describe, expect, it, vi } from "vitest";

// isPreview is read when the module loads, so each case imports a fresh copy.
async function robotsWith(preview: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SHOP_PREVIEW", preview);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thriftesque.com/");
  return (await import("./robots")).default();
}

describe("robots.txt", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets crawlers into the shop but not the team pages", async () => {
    const r = await robotsWith(undefined);
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/dashboard", "/login", "/api/"] });
    expect(r.sitemap).toBe("https://thriftesque.com/sitemap.xml");
  });

  it("keeps every crawler out while the domain shows sample pieces (D-044)", async () => {
    const r = await robotsWith("1");
    expect(r.rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});
