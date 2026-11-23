// Shop stats (D-067): what the shop counts and how a count is checked before it reaches the database. Pure, so the exact
// rules are unit tested. Counts carry piece codes and prices only: never a name, phone number, area or message text.

const CODE = /^TQ-\d{4,}$/;
const MAX_ITEMS = 30; // the bag's own limit (lib/bag-store.ts)
export const MAX_BODY = 4096;

export type SentItem = { code: string; price: number };

export type StatEvent =
  | { name: "page_view"; path: string; props: { landing?: true; source?: string } }
  | { name: "product_view"; path: string; props: { code: string } }
  | { name: "bag_add"; path: string; props: { codes: string[] } }
  | { name: "order_sent"; path: string; props: { items: SentItem[]; subtotal: number; fee: number; total: number; mode: "delivery" | "pickup" } }
  | { name: "ask_sent"; path: string; props: { kind: "piece" | "outfit" | "look"; items: SentItem[] } };

export type StatName = StatEvent["name"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const qar = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 1_000_000;

function items(v: unknown): SentItem[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_ITEMS) return null;
  const out: SentItem[] = [];
  for (const i of v) {
    if (!isObj(i) || typeof i.code !== "string" || !CODE.test(i.code) || !qar(i.price)) return null;
    out.push({ code: i.code, price: i.price });
  }
  return out;
}

// Only the site's own pages, without a query string or fragment, so nothing typed into a URL is kept.
function cleanPath(v: unknown): string | null {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//")) return null;
  const path = v.split(/[?#]/)[0];
  return /^[A-Za-z0-9/._~-]{1,200}$/.test(path) ? path : null;
}

// Where a visit came from: a short lowercase site name or campaign tag, or nothing.
export function cleanSource(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase().replace(/^www\./, "");
  return /^[a-z0-9][a-z0-9._-]{0,59}$/.test(s) ? s : undefined;
}

// The count as sent by the browser, rebuilt field by field so nothing unexpected is stored. null: not a valid count.
export function parseEvent(raw: unknown): StatEvent | null {
  if (!isObj(raw) || !isObj(raw.props)) return null;
  const path = cleanPath(raw.path);
  if (!path) return null;
  const p = raw.props;
  switch (raw.name) {
    case "page_view": {
      const source = cleanSource(p.source);
      return { name: "page_view", path, props: { ...(p.landing === true ? { landing: true as const } : {}), ...(source ? { source } : {}) } };
    }
    case "product_view":
      return typeof p.code === "string" && CODE.test(p.code) ? { name: "product_view", path, props: { code: p.code } } : null;
    case "bag_add": {
      const codes = Array.isArray(p.codes) ? p.codes : [];
      if (codes.length < 1 || codes.length > MAX_ITEMS || !codes.every((c) => typeof c === "string" && CODE.test(c))) return null;
      return { name: "bag_add", path, props: { codes: codes as string[] } };
    }
    case "order_sent": {
      const list = items(p.items);
      if (!list || !qar(p.subtotal) || !qar(p.fee) || !qar(p.total) || (p.mode !== "delivery" && p.mode !== "pickup")) return null;
      return { name: "order_sent", path, props: { items: list, subtotal: p.subtotal, fee: p.fee, total: p.total, mode: p.mode } };
    }
    case "ask_sent": {
      const list = items(p.items);
      if (!list || (p.kind !== "piece" && p.kind !== "outfit" && p.kind !== "look")) return null;
      return { name: "ask_sent", path, props: { kind: p.kind, items: list } };
    }
    default:
      return null;
  }
}

// Search engines, link previews (WhatsApp, TikTok) and test browsers aren't shoppers.
export function isBot(ua: string | null): boolean {
  return !ua || /^WhatsApp\//.test(ua) || /bot|crawl|spider|slurp|preview|headless|facebookexternalhit|lighthouse|curl|wget|python|node-fetch/i.test(ua);
}

export type Recorder = (e: StatEvent, fingerprint: string) => Promise<void>;

// The /api/tally route, minus the database. Always answers 204 so a page never waits on, or learns from, a count.
export async function handleTally(req: Request, opts: { enabled: boolean; record: Recorder }): Promise<Response> {
  const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (!opts.enabled) return done();
  // Same site only, so other sites can't fill the stats.
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) return done();
  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return done();
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) return done();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return done();
  }
  const event = parseEvent(body);
  if (!event) return done();
  // Hashed with a salt that changes daily in the database (record_event) and never stored as it is.
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  await opts.record(event, `${ip} ${ua}`).catch(() => {});
  return done();
}
