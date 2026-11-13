// "Fill from photo" (D-012): a signed-in team member sends the path of a photo they uploaded; we send only that photo and a
// fixed prompt to Gemini and return form suggestions. Nothing is saved here. The team reviews before saving.
import { AUTOFILL_PROMPT, AUTOFILL_SCHEMA, cleanAutofill } from "@/lib/ai";
import { geminiJson } from "@/lib/gemini";
import { requireTeam } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/supabase/public";

const MAX_BODY = 1024;
const MAX_PHOTO = 400 * 1024;
const json = (status: number, body: object) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  // Same-origin only: a page on another site can't make a signed-in team member's browser spend the AI quota.
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) return json(403, { error: "Not allowed." });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: "Request too large." });
  let path: unknown;
  try {
    path = (JSON.parse(raw) as { path?: unknown }).path;
  } catch {
    return json(400, { error: "Bad request." });
  }
  if (typeof path !== "string" || !/^[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.(webp|jpg)$/.test(path)) return json(400, { error: "Bad photo path." });

  const t = await requireTeam();
  if (!t.ok) return json(t.error.startsWith("You're signed out") ? 401 : 403, { error: t.error });

  // Only ever our own bucket, by path, so this can't be pointed at other URLs.
  const photo = await fetch(photoUrl(path)).catch(() => null);
  if (!photo?.ok) return json(404, { error: "Couldn't read that photo. Upload it again." });
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (bytes.length > MAX_PHOTO) return json(413, { error: "That photo is too large." });

  const r = await geminiJson(
    [{ inline_data: { mime_type: photo.headers.get("content-type") ?? "image/webp", data: Buffer.from(bytes).toString("base64") } }, { text: AUTOFILL_PROMPT }],
    AUTOFILL_SCHEMA,
  );
  if (!r.ok) return json(r.status, { error: r.error });
  const fields = cleanAutofill(r.json);
  if (!fields) return json(502, { error: "The AI couldn't describe this photo. Fill it in by hand." });
  return json(200, { fields, model: r.model });
}
