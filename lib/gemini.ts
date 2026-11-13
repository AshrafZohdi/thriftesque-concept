// Gemini over plain fetch (D-012, D-039): no SDK, so nothing extra in the Worker. Server only; the key never reaches a browser.
// Default model from GEMINI_MODEL; on 429 (rate limit) or 503 (overloaded) it tries GEMINI_FALLBACK_MODEL once.
const API = "https://generativelanguage.googleapis.com/v1beta/models";

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
export type GeminiResult = { ok: true; json: unknown; model: string } | { ok: false; status: number; error: string };

export async function geminiJson(parts: Part[], schema: object, { maxOutputTokens = 1024, timeoutMs = 30_000 } = {}): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, status: 503, error: "AI isn't set up yet. Fill the fields in by hand." };
  const models = [process.env.GEMINI_MODEL || "gemini-3.8-flash", process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite"];

  for (const [i, model] of models.entries()) {
    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          // Flash thinks at "medium" by default, which is slow for describing a photo or pairing pieces, so the main model gets
          // "low" (it refuses "minimal"). The Flash-Lite fallback already defaults to "minimal", so it gets nothing.
          generationConfig: {
            responseMimeType: "application/json", responseSchema: schema, temperature: 0.4, maxOutputTokens,
            ...(i === 0 ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      console.error(`gemini ${model} timed out after ${Date.now() - started} ms`);
      return { ok: false, status: 504, error: "The AI didn't answer in time. Try again, or fill it in by hand." };
    }
    if (!res.ok) {
      // Server log only, for whoever maintains the site. Google's error text names the problem (model, quota, schema), never the key.
      const detail = await res.text().catch(() => "");
      console.error(`gemini ${model} ${res.status} after ${Date.now() - started} ms: ${detail.replace(/\s+/g, " ").slice(0, 300)}`);
    }
    // Rate limited (429) or overloaded (503): the smaller model usually still answers.
    if ((res.status === 429 || res.status === 503) && i === 0) continue;
    if (!res.ok) return failure(res.status);
    const data = (await res.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
    console.log(`gemini ${model} ok in ${Date.now() - started} ms`);
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try {
      return { ok: true, json: JSON.parse(text), model };
    } catch {
      return { ok: false, status: 502, error: "The AI's answer didn't make sense. Try again, or fill it in by hand." };
    }
  }
  return failure(429);
}

function failure(status: number): GeminiResult & { ok: false } {
  if (status === 429) return { ok: false, status: 429, error: "The free AI limit is used up for now. Try again later, or fill it in by hand." };
  if (status === 503) return { ok: false, status: 503, error: "The AI is busy right now. Try again in a minute, or fill it in by hand." };
  return { ok: false, status: 502, error: "The AI couldn't help with this one. Fill it in by hand." };
}
