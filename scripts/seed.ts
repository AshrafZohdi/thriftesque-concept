// Seeds the LOCAL database with the 21 sample products and photos from design/. Safe to run repeatedly.
// Usage: npm run seed   (asks the local Supabase for its URL and secret key; refuses to run against anything else)
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { PHOTO } from "../lib/photo-spec.ts";
import { EMPTY_DETAILS, detailsToRow } from "../lib/shop-facts.ts";
import { SAMPLE_LOOKS, SAMPLE_SALE, SAMPLE_SECTIONS, SAMPLE_SETTINGS, cutoutFileFor, loadSeed, toWebp } from "./sample-data.ts";
import { DEV_STRANGER, DEV_TEAM } from "./dev-accounts.ts";

// The secret key comes straight from the local stack, never from an env file: OpenNext bakes every variable in the
// project's env files into the Worker bundle, and the secret key must never be there (D-038).
function localStack(): { url: string; secret: string } {
  let out = "";
  try {
    out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("Local Supabase isn't running. Start it with: npx supabase start");
  }
  const get = (k: string) => out.match(new RegExp(`^${k}="?([^"\\n]*)"?$`, "m"))?.[1] ?? "";
  return { url: get("API_URL"), secret: get("SECRET_KEY") };
}
const { url, secret } = localStack();
if (!url || !secret) throw new Error("Couldn't read the local Supabase URL and secret key from `supabase status`.");

const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  throw new Error(`Refusing to seed ${host}: sample data is for the local database only.`);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

async function ensureUser(email: string, password: string): Promise<string> {
  const list = await db.auth.admin.listUsers({ perPage: 200 });
  if (list.error) throw new Error(`Users: ${list.error.message}`);
  const found = list.data.users.find((u) => u.email === email);
  if (found) {
    const upd = await db.auth.admin.updateUserById(found.id, { password });
    if (upd.error) throw new Error(`User ${email}: ${upd.error.message}`);
    return found.id;
  }
  const made = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (made.error) throw new Error(`User ${email}: ${made.error.message}`);
  return made.data.user.id;
}

async function main() {
  const seed = await loadSeed();
  let bytes = 0;

  for (const p of seed) {
    const { data, quality } = await toWebp(p.photo);
    bytes += data.length;
    const path = `${p.code}/seed-cover.webp`;
    const up = await db.storage.from(PHOTO.bucket).upload(path, data, { contentType: "image/webp", upsert: true });
    if (up.error) throw new Error(`Upload ${path}: ${up.error.message}`);

    // Cut-outs were made once with macOS Vision and live in design/img/cutouts (D-027).
    const cutoutPath = `${p.code}/seed-cutout.webp`;
    const cutoutFile = cutoutFileFor(p.photo);
    const cut = await db.storage.from(PHOTO.bucket).upload(cutoutPath, await readFile(cutoutFile), { contentType: "image/webp", upsert: true });
    if (cut.error) throw new Error(`Upload ${cutoutPath}: ${cut.error.message}`);

    const row = {
      code: p.code,
      name: p.name,
      brand: p.brand,
      era: p.era,
      category: p.category,
      size: p.size,
      price_qar: p.price_qar,
      was_price_qar: SAMPLE_SALE[p.code] ?? null,
      section_ids: [] as string[],
      condition: p.condition,
      measurements: p.measurements_cm,
      status: p.status,
      photos: [path],
      cutout: cutoutPath,
    };
    const { error } = await db.from("products").upsert(row, { onConflict: "code" });
    if (error) throw new Error(`Product ${p.code}: ${error.message}`);
    console.log(`${p.code}  ${(data.length / 1024).toFixed(1).padStart(5)} KB  q${quality}  ${p.name}`);
  }

  // Local resets must be exact: products added by tests or by hand are removed, with their photos.
  const extra = await db.from("products").select("code, photos, cutout").not("code", "in", `(${seed.map((p) => p.code).join(",")})`);
  if (extra.error) throw new Error(`Extra products: ${extra.error.message}`);
  if (extra.data.length) {
    const paths = extra.data.flatMap((r) => [...r.photos, ...(r.cutout ? [r.cutout] : [])]);
    if (paths.length) await db.storage.from(PHOTO.bucket).remove(paths);
    const del = await db.from("products").delete().in("code", extra.data.map((r) => r.code));
    if (del.error) throw new Error(`Extra products: ${del.error.message}`);
    console.log(`removed ${extra.data.length} product(s) not in the seed: ${extra.data.map((r) => r.code).join(", ")}`);
  }

  // Shop details, the about text and photos reset to empty, so the dashboard and pages start empty (tests fill them in).
  // About photos a test uploaded are removed from storage too.
  const about = await db.storage.from(PHOTO.bucket).list("a");
  if (about.data?.length) await db.storage.from(PHOTO.bucket).remove(about.data.map((f) => `a/${f.name}`));
  const settings = await db.from("settings").update({ ...SAMPLE_SETTINGS, ...detailsToRow(EMPTY_DETAILS), about_text: "", about_photos: [] }).eq("id", 1);
  if (settings.error) throw new Error(`Settings: ${settings.error.message}`);

  // Sections reset exactly (D-060); removing them also clears them off the products.
  const noSections = await db.from("sections").delete().not("id", "is", null);
  if (noSections.error) throw new Error(`Sections: ${noSections.error.message}`);
  for (const [position, sec] of SAMPLE_SECTIONS.entries()) {
    const made = await db.from("sections").insert({ name: sec.name, position }).select("id").single();
    if (made.error) throw new Error(`Section ${sec.name}: ${made.error.message}`);
    if (sec.codes.length) {
      const tagged = await db.from("products").update({ section_ids: [made.data.id] }).in("code", sec.codes);
      if (tagged.error) throw new Error(`Section ${sec.name}: ${tagged.error.message}`);
    }
  }

  // Local data resets exactly, including AI drafts made while testing.
  const cleared = await db.from("looks").delete().not("id", "is", null);
  if (cleared.error) throw new Error(`Looks: ${cleared.error.message}`);
  const looks = await db.from("looks").insert(SAMPLE_LOOKS.map((l) => ({ ...l, source: "team" as const, status: "published" as const })));
  if (looks.error) throw new Error(`Looks: ${looks.error.message}`);

  // Local sign-in accounts: one on the team, one signed in but not on the team (to test that it's refused).
  const teamId = await ensureUser(DEV_TEAM.email, DEV_TEAM.password);
  await ensureUser(DEV_STRANGER.email, DEV_STRANGER.password);
  const member = await db.from("team_members").upsert({ user_id: teamId, name: DEV_TEAM.name });
  if (member.error) throw new Error(`Team member: ${member.error.message}`);

  const seq = await db.rpc("sync_product_code_seq");
  if (seq.error) throw new Error(`Code sequence: ${seq.error.message}`);

  console.log(`\n${seed.length} products with cut-outs, ${SAMPLE_LOOKS.length} looks, ${(bytes / 1024).toFixed(0)} KB of photos. Next new code: TQ-${String(Number(seq.data) + 1).padStart(4, "0")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
