import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "./canonical-host";

describe("canonicalRedirect", () => {
  it("sends www to the bare domain, keeping the path and query", () => {
    expect(canonicalRedirect("https://www.thriftesque.com/p/TQ-0001?ref=tiktok")).toBe("https://thriftesque.com/p/TQ-0001?ref=tiktok");
    expect(canonicalRedirect("http://www.thriftesque.com/")).toBe("https://thriftesque.com/");
  });
  it("upgrades plain http to https", () => {
    expect(canonicalRedirect("http://thriftesque.com/p/TQ-0001?x=1")).toBe("https://thriftesque.com/p/TQ-0001?x=1");
  });
  it("serves https on the bare domain and anything local", () => {
    expect(canonicalRedirect("https://thriftesque.com/")).toBeNull();
    expect(canonicalRedirect("http://localhost:8787/p/TQ-0701")).toBeNull();
    expect(canonicalRedirect("http://127.0.0.1:8787/")).toBeNull();
  });
});
