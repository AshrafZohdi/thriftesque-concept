import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geminiJson } from "./gemini";

const answer = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });

describe("geminiJson", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "main-model");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "small-model");
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks for JSON with the schema and sends the key in a header, not the URL", async () => {
    fetchMock.mockResolvedValueOnce(answer({ name: "Tee" }));
    const r = await geminiJson([{ text: "hi" }], { type: "OBJECT" });
    expect(r).toEqual({ ok: true, json: { name: "Tee" }, model: "main-model" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/models\/main-model:generateContent$/);
    expect(String(url)).not.toContain("test-key");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(String(init!.body));
    expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json", responseSchema: { type: "OBJECT" }, thinkingConfig: { thinkingLevel: "low" } });
  });

  it("on a rate limit tries the fallback model once", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 })).mockResolvedValueOnce(answer({ ok: 1 }));
    const r = await geminiJson([{ text: "hi" }], {});
    expect(r).toMatchObject({ ok: true, model: "small-model" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The fallback keeps its own thinking default.
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]!.body)).generationConfig.thinkingConfig).toBeUndefined();
  });

  it("an overloaded model (503) also falls back, and says the AI is busy if both are", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(answer({ ok: 1 }));
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: true, model: "small-model" });
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: false, status: 503, error: expect.stringContaining("busy") });
  });

  it("gives up after the fallback is rate limited too", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: false, status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry other errors, and never passes Google's error text on", async () => {
    fetchMock.mockResolvedValueOnce(new Response("API key not valid: secret details", { status: 400 }));
    const r = await geminiJson([{ text: "hi" }], {});
    expect(r).toMatchObject({ ok: false, status: 502 });
    expect(JSON.stringify(r)).not.toContain("secret details");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles a broken answer", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] })));
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: false, status: 502 });
  });

  it("when the main model is silent or erroring, the fallback answers (found live: Suggest looks timed out)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(answer({ looks: [] }));
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: true, model: "small-model" });
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 })).mockResolvedValueOnce(answer({ ok: 1 }));
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: true, model: "small-model" });
  });

  it("gives the main model half the time and the fallback all of it", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockRejectedValueOnce(new Error("timeout")).mockRejectedValueOnce(new Error("timeout"));
    expect(await geminiJson([{ text: "hi" }], {}, { timeoutMs: 40_000 })).toMatchObject({ ok: false, status: 504 });
    expect(spy.mock.calls.map((c) => c[0])).toEqual([20_000, 40_000]);
    spy.mockRestore();
  });

  it("without a key it says AI isn't set up and calls nothing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await geminiJson([{ text: "hi" }], {})).toMatchObject({ ok: false, status: 503, error: expect.stringContaining("AI isn't set up") });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
