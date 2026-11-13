import { describe, expect, it } from "vitest";
import { wwwRedirect } from "./canonical-host";

describe("wwwRedirect", () => {
  it("sends www to the bare domain, keeping the path and query", () => {
    expect(wwwRedirect("https://www.thriftesque.com/p/TQ-0001?ref=tiktok")).toBe("https://thriftesque.com/p/TQ-0001?ref=tiktok");
    expect(wwwRedirect("http://www.thriftesque.com/")).toBe("https://thriftesque.com/");
  });
  it("leaves everything else alone", () => {
    expect(wwwRedirect("https://thriftesque.com/")).toBeNull();
    expect(wwwRedirect("http://localhost:8787/p/TQ-0701")).toBeNull();
    expect(wwwRedirect("https://thriftesque-production.example.workers.dev/")).toBeNull();
  });
});
