// Loads or removes the sample pieces on a deployed shop while the domain is in preview (D-044).
//   npm run demo -- load <target> <team email>
//   npm run demo -- remove <target> <team email>
// Signs in as a team member (asks for the password, hidden), so the database's own rules apply. It never uses the secret
// key and never creates accounts. The Supabase URL and publishable key come from env.<target>.vars in wrangler.jsonc.
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";
import { PHOTO } from "../lib/photo-spec.ts";
import { SAMPLE_LOOKS, SAMPLE_SETTINGS, cutoutFileFor, loadSeed, toWebp } from "./sample-data.ts";
import { targetVars } from "./wrangler-config.mjs";

const [mode, target, email] = process.argv.slice(2);
if (!["load", "remove"].includes(mode) || !target || !email) {
  console.error("Usage: npm run demo -- <load|remove> <target> <team email>");
  process.exit(1);
}
const { vars } = targetVars(target) as { vars: Record<string, string> | null };
const url = vars?.NEXT_PUBLIC_SUPABASE_URL;
const key = vars?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(`No Supabase URL or publishable key for "${target}" in wrangler.jsonc.`);
  process.exit(1);
}

// Typed characters aren't echoed.
function askHidden(question: string): Promise<string> {
  let muted = false;
  const out = new Writable({ write: (chunk, _enc, cb) => { if (!muted) process.stdout.write(chunk); cb(); } });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
    muted = true;
  });
}

const db = createClient<Database>(url, key, { auth: { persistSession: false } });

async function main() {
  console.log(`${mode} sample pieces on ${target} (${url}) as ${email}`);
  // DEMO_PASSWORD is for the local test account only; real accounts type it at the prompt.
  const password = process.env.DEMO_PASSWORD ?? (await askHidden("Team password: "));
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`Sign-in failed: ${signIn.error.message}`);
  const team = await db.rpc("is_team");
  if (team.data !== true) throw new Error(`${email} isn't in team_members on ${target}. Add it first (runbook).`);

  const seed = await loadSeed();
  const codes = seed.map((p) => p.code);
  const current = await db.from("products").select("code, photos, cutout");
  if (current.error) throw new Error(`Products: ${current.error.message}`);

  if (mode === "remove") {
    const demo = current.data.filter((r) => codes.includes(r.code));
    const paths = demo.flatMap((r) => [...r.photos, ...(r.cutout ? [r.cutout] : [])]);
    const looks = await db.from("looks").delete().eq("source", "team").in("title", SAMPLE_LOOKS.map((l) => l.title)).select("id");
    if (looks.error) throw new Error(`Looks: ${looks.error.message}`);
    if (demo.length) {
      const del = await db.from("products").delete().in("code", demo.map((r) => r.code));
      if (del.error) throw new Error(`Products: ${del.error.message}`);
    }
    if (paths.length) {
      const rm = await db.storage.from(PHOTO.bucket).remove(paths);
      if (rm.error) throw new Error(`Photos: ${rm.error.message}`);
    }
    console.log(`Removed ${demo.length} sample products, ${paths.length} photos and ${looks.data.length} sample looks.`);
  } else {
    // Never mix samples with real stock.
    const real = current.data.filter((r) => !codes.includes(r.code));
    if (real.length) throw new Error(`Refusing: ${real.length} real product(s) exist (${real.slice(0, 5).map((r) => r.code).join(", ")}).`);

    let bytes = 0;
    for (const p of seed) {
      const { data } = await toWebp(p.photo);
      bytes += data.length;
      const photo = `${p.code}/seed-cover.webp`;
      const cutout = `${p.code}/seed-cutout.webp`;
      for (const [path, body] of [[photo, data], [cutout, await readFile(cutoutFileFor(p.photo))]] as const) {
        const up = await db.storage.from(PHOTO.bucket).upload(path, body, { contentType: "image/webp", upsert: true });
        if (up.error) throw new Error(`Upload ${path}: ${up.error.message}`);
      }
      const row = {
        code: p.code, name: p.name, brand: p.brand, era: p.era, category: p.category, size: p.size, price_qar: p.price_qar,
        condition: p.condition, measurements: p.measurements_cm, status: p.status as Database["public"]["Enums"]["product_status"],
        photos: [photo], cutout,
      };
      const { error } = await db.from("products").upsert(row, { onConflict: "code" });
      if (error) throw new Error(`Product ${p.code}: ${error.message}`);
      process.stdout.write(".");
    }
    console.log(`\n${seed.length} sample products, ${(bytes / 1024).toFixed(0)} KB of photos.`);

    const looks = await db.from("looks").select("id").limit(1);
    if (looks.error) throw new Error(`Looks: ${looks.error.message}`);
    if (!looks.data.length) {
      const ins = await db.from("looks").insert(SAMPLE_LOOKS.map((l) => ({ ...l, source: "team" as const, status: "published" as const })));
      if (ins.error) throw new Error(`Looks: ${ins.error.message}`);
      console.log(`${SAMPLE_LOOKS.length} sample looks.`);
    }

    // Only fills settings nobody has set yet. No WhatsApp number, so the preview shows no order buttons (D-044).
    const s = await db.from("settings").select("drop_name, delivery_fees").eq("id", 1).single();
    if (s.error) throw new Error(`Settings: ${s.error.message}`);
    const fees = Array.isArray(s.data.delivery_fees) ? s.data.delivery_fees : [];
    if (!s.data.drop_name && !fees.length) {
      const upd = await db.from("settings").update({ drop_name: "Preview", delivery_fees: SAMPLE_SETTINGS.delivery_fees }).eq("id", 1);
      if (upd.error) throw new Error(`Settings: ${upd.error.message}`);
      console.log("Settings: drop name \"Preview\" and the sample delivery fees. WhatsApp number left empty.");
    }
  }

  await db.auth.signOut();
  console.log("\nCached pages don't know about this yet: deploy, or press Save settings in the dashboard, to refresh them.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
