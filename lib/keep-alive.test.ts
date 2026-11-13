import { describe, expect, it, vi } from "vitest";
import { keepAlive } from "./keep-alive";

describe("keepAlive", () => {
  it("reads one settings row with the publishable key", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", { status: 200 }));
    await keepAlive("https://x.supabase.co", "sb_publishable_test", f);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/settings?select=id&limit=1");
    expect(init!.headers).toEqual({ apikey: "sb_publishable_test" });
  });
  it("fails loudly so the cron run is marked failed", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    await expect(keepAlive("https://x.supabase.co", "k", f)).rejects.toThrow("Supabase answered 503");
    await expect(keepAlive(undefined, "k", f)).rejects.toThrow("missing");
  });
});
