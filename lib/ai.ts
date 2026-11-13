// AI helpers that don't touch the network: prompts, response schemas, and cleaning what Gemini returns (D-012, D-028).
// Only product photos and product facts are ever sent, never customer data.
import { CATEGORIES, ERAS, type Category, type Era } from "./catalog";
import { slotOf } from "./outfit";

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s*\u2014\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max) : "");

export const AUTOFILL_PROMPT = `You help a secondhand clothing shop in Doha list one piece. The photo shows a single item of clothing, shoes or a bag.
Return JSON only, with:
- name: a short plain product name of 2 to 6 words, like "Navy stripe ringer tee". Include a brand only if a logo is clearly visible.
- category: one of ${CATEGORIES.join(", ")}.
- colour: the main colour in 1 to 3 words.
- era: the decade the style looks like, one of ${ERAS.join(", ")}.
- description: 1 or 2 plain sentences about what you can see: fabric, cut and details. Don't mention condition, size, price or brand.
- styling_tip: one short sentence on how to wear it.
Plain English. No hype words. No em dashes.`;

export const AUTOFILL_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    category: { type: "STRING", enum: [...CATEGORIES] },
    colour: { type: "STRING" },
    era: { type: "STRING", enum: [...ERAS] },
    description: { type: "STRING" },
    styling_tip: { type: "STRING" },
  },
  required: ["name", "category", "colour", "era", "description", "styling_tip"],
} as const;

export type AutofillFields = { name: string; category: Category | null; colour: string; era: Era | null; description: string; stylingTip: string };

// Keeps only what fits the form; anything off-list becomes null so the team picks it.
export function cleanAutofill(raw: unknown): AutofillFields | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = clip(r.name, 120);
  if (!name) return null;
  return {
    name,
    category: (CATEGORIES as readonly string[]).includes(r.category as string) ? (r.category as Category) : null,
    colour: clip(r.colour, 40),
    era: (ERAS as readonly string[]).includes(r.era as string) ? (r.era as Era) : null,
    description: clip(r.description, 1000),
    stylingTip: clip(r.styling_tip, 300),
  };
}

export type LookPiece = { code: string; name: string; category: Category; colour: string | null; era: string; size: string };

export function looksPrompt(pieces: LookPiece[]): string {
  const list = pieces.map((p) => `${p.code} | ${p.category} | ${p.name}${p.colour ? ` | ${p.colour}` : ""} | ${p.era} | size ${p.size}`).join("\n");
  return `You put outfits together for a secondhand clothing shop in Doha. Every piece is one of one.
Here is what's in stock (code | category | name | colour | era | size):
${list}

Suggest up to 6 outfits using only these codes. Each outfit is either:
- one piece from Tops, Knitwear or Outerwear, plus one from Bottoms, plus optionally one pair of Shoes, or
- one from Dresses, plus one pair of Shoes.
Pick pieces whose colours and styles go together. Don't repeat the same set twice.
For each outfit return a title of 2 to 5 plain words (like "Denim day") and a note of one plain sentence naming the pieces.
No hype words. No em dashes.`;
}

export const LOOKS_SCHEMA = {
  type: "OBJECT",
  properties: {
    looks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, note: { type: "STRING" }, codes: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["title", "note", "codes"],
      },
    },
  },
  required: ["looks"],
} as const;

export type LookSuggestion = { title: string; note: string; codes: string[] };

// Keeps a suggested look only if every code is a piece we sent, the slot rules hold, and it isn't a repeat (D-028).
// The rules match the looks table's check (2 to 4 pieces), so one bad suggestion can't make the whole insert fail.
export function validLooks(raw: unknown, pieces: LookPiece[], existing: string[][]): { looks: LookSuggestion[]; rejected: number } {
  const list = Array.isArray((raw as { looks?: unknown })?.looks) ? (raw as { looks: unknown[] }).looks : [];
  const byCode = new Map(pieces.map((p) => [p.code, p]));
  const seen = new Set(existing.map((c) => [...c].sort().join(",")));
  const looks: LookSuggestion[] = [];
  for (const item of list.slice(0, 10)) {
    const r = (item ?? {}) as Record<string, unknown>;
    const codes = Array.isArray(r.codes) ? [...new Set(r.codes.filter((c): c is string => typeof c === "string"))] : [];
    const title = clip(r.title, 60);
    const note = clip(r.note, 200);
    const slots = codes.map((c) => (byCode.has(c) ? slotOf(byCode.get(c)!.category) : undefined));
    const count = (k: string) => slots.filter((s) => s === k).length;
    // 2 to 4 pieces, like the database check and the shop (a dress needs shoes to count as a look).
    const shapeOk = codes.length >= 2 && codes.length <= 4 && !slots.includes(undefined) && count("shoes") <= 1 &&
      ((count("dress") === 1 && count("top") === 0 && count("bottom") === 0) || (count("dress") === 0 && count("top") === 1 && count("bottom") === 1));
    const key = [...codes].sort().join(",");
    if (!title || !shapeOk || seen.has(key)) continue;
    seen.add(key);
    looks.push({ title, note, codes });
  }
  return { looks: looks.slice(0, 6), rejected: list.length - Math.min(looks.length, 6) };
}
