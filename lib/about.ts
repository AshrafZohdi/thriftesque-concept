// The About page's text (D-059): what the team wrote on the dashboard, or a short default made only from facts already on the
// site. Plain text, never HTML; a blank line starts a new paragraph.
import type { AboutPhoto } from "./shop-model";
import { LOCATION } from "./shop-facts";

export const ABOUT_MAX = 3000;

export const ABOUT_DEFAULT = [
  `Thriftesque is a secondhand clothing shop in ${LOCATION}. Every piece is hand-picked, checked and measured, and one of one: when it's sold, it's gone.`,
  "New pieces arrive in drops. Add what you like to your bag and send the order on WhatsApp. We reply to confirm, then arrange delivery or pickup.",
  "Follow us on TikTok at @thriftesque.",
];

export function aboutParagraphs(text: string): string[] {
  const own = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return own.length ? own : ABOUT_DEFAULT;
}

// Cleans what the team typed, or returns the problem in plain words. The limit matches the database check.
export function validateAbout(input: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const value = String(input ?? "").replace(/\r\n?/g, "\n").replace(/\s*—\s*/g, ", ").replace(/\n{3,}/g, "\n\n").trim();
  if (value.length > ABOUT_MAX) return { ok: false, error: `About us: ${ABOUT_MAX} characters at most (now ${value.length}).` };
  return { ok: true, value };
}

// The search and share description: the opening of the first paragraph, within 160 characters.
export function aboutSnippet(paragraphs: string[]): string {
  const first = paragraphs[0].replace(/\s+/g, " ");
  if (first.length <= 160) return first;
  const cut = first.slice(0, 159);
  const sentence = cut.lastIndexOf(". ");
  return sentence > 80 ? cut.slice(0, sentence + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

// Photos on the About page (D-060): the team's model shots, stored under a/ in the photo bucket, each with an optional
// description for screen readers and search.
export const ABOUT_PHOTOS_MAX = 8;
export const ABOUT_ALT_MAX = 120;
const ABOUT_PATH = /^a\/[A-Za-z0-9-]+\.(webp|jpg)$/;

// Reads the stored list, dropping anything malformed rather than breaking the page.
export function aboutPhotosFrom(raw: unknown): AboutPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({ path: String(x?.path ?? ""), alt: String(x?.alt ?? "") }))
    .filter((x) => ABOUT_PATH.test(x.path))
    .slice(0, ABOUT_PHOTOS_MAX);
}

export function validateAboutPhotos(input: unknown): { ok: true; value: AboutPhoto[] } | { ok: false; error: string } {
  const list = Array.isArray(input) ? input : [];
  if (list.length > ABOUT_PHOTOS_MAX) return { ok: false, error: `About photos: ${ABOUT_PHOTOS_MAX} at most.` };
  const value: AboutPhoto[] = [];
  for (const [i, x] of list.entries()) {
    const path = String(x?.path ?? "");
    const alt = String(x?.alt ?? "").replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();
    if (!ABOUT_PATH.test(path)) return { ok: false, error: "An About photo didn't upload properly. Remove it and add it again." };
    if (alt.length > ABOUT_ALT_MAX) return { ok: false, error: `About photo ${i + 1}: the description is ${ABOUT_ALT_MAX} characters at most.` };
    value.push({ path, alt });
  }
  return { ok: true, value };
}
