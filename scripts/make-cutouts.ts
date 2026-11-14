// Cut-outs for pieces in the shop that have none, made on this Mac with macOS Vision (D-054), then saved as a team member.
//   npm run cutouts -- make production            downloads the cover photos and makes cut-outs into backups/cutouts-<date>/,
//                                                 with review.jpg (all of them on the shop's blue). Needs no sign-in.
//   npm run cutouts -- save production <email>    asks for the password (hidden), uploads them and sets each piece's cut-out.
// Saving never overwrites a cut-out a piece already has. The pages pick them up on the next deploy or dashboard save.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "../lib/database.types.ts";
import { CUTOUT, PHOTO } from "../lib/photo-spec.ts";
import { targetVars } from "./wrangler-config.mjs";

const [mode, target, email] = process.argv.slice(2);
if (!["make", "save"].includes(mode) || !target || (mode === "save" && !email)) {
  console.error("Usage: npm run cutouts -- make <target>   |   npm run cutouts -- save <target> <team email>");
  process.exit(1);
}
const { vars } = targetVars(target) as { vars: Record<string, string> | null };
const url = vars?.NEXT_PUBLIC_SUPABASE_URL;
const key = vars?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(`No Supabase URL or publishable key for "${target}" in wrangler.jsonc.`);
  process.exit(1);
}
const dir = `backups/cutouts-${new Date().toISOString().slice(0, 10)}`;
const db = createClient<Database>(url, key, { auth: { persistSession: false } });
const publicUrl = (path: string) => db.storage.from(PHOTO.bucket).getPublicUrl(path).data.publicUrl;

async function needing() {
  const { data, error } = await db.from("products").select("code,name,photos,status").in("status", ["live", "reserved"]).is("cutout", null).order("code");
  if (error) throw new Error(error.message);
  return data.filter((p) => p.photos[0]);
}

async function make() {
  mkdirSync(dir, { recursive: true });
  const list = await needing();
  console.log(`${list.length} pieces without a cut-out. Working in ${dir}`);
  const made: { code: string; file: string }[] = [];
  for (const p of list) {
    const src = `${dir}/${p.code}.src`;
    writeFileSync(src, Buffer.from(await (await fetch(publicUrl(p.photos[0]))).arrayBuffer()));
    try {
      execFileSync("swift", ["scripts/vision-cutout.swift", src, `${dir}/${p.code}.png`], { stdio: ["ignore", "ignore", "pipe"] });
    } catch {
      console.log(`  ${p.code}  no subject found, skipped (${p.name})`);
      continue;
    }
    // Same output as the editor's cut-outs: trimmed to the piece, at most 600 px on the long side, WebP with transparency.
    const out = `${dir}/${p.code}.webp`;
    const buf = await sharp(`${dir}/${p.code}.png`).trim({ threshold: 1 }).resize(CUTOUT.maxSide, CUTOUT.maxSide, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 }).toBuffer();
    writeFileSync(out, buf);
    made.push({ code: p.code, file: out });
    console.log(`  ${p.code}  ${(buf.length / 1024).toFixed(0)} KB  ${p.name}`);
  }
  // One contact sheet, on the shop's sky blue, to check them all by eye.
  const cell = 200;
  const cols = 6;
  const tiles = await Promise.all(made.map(async (m, i) => ({
    input: await sharp(m.file).resize(cell - 16, cell - 30, { fit: "inside" }).toBuffer(),
    left: (i % cols) * cell + 8, top: Math.floor(i / cols) * cell + 8,
  })));
  const labels = made.map((m, i) => `<text x="${(i % cols) * cell + 8}" y="${Math.floor(i / cols) * cell + cell - 6}" font-family="Menlo" font-size="13">${m.code}</text>`).join("");
  const h = Math.ceil(made.length / cols) * cell || cell;
  await sharp({ create: { width: cols * cell, height: h, channels: 3, background: "#8ecbff" } })
    .composite([...tiles, { input: Buffer.from(`<svg width="${cols * cell}" height="${h}">${labels}</svg>`), left: 0, top: 0 }])
    .jpeg({ quality: 80 }).toFile(`${dir}/review.jpg`);
  console.log(`\n${made.length} cut-outs made. Check ${dir}/review.jpg, then: npm run cutouts -- save ${target} <team email>`);
}

function askHidden(question: string): Promise<string> {
  let muted = false;
  const out = new Writable({ write: (chunk, _enc, cb) => { if (!muted) process.stdout.write(chunk); cb(); } });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
    muted = true;
  });
}

async function save() {
  const files = readdirSync(dir).filter((f) => /^TQ-\d+\.webp$/.test(f));
  if (!files.length) throw new Error(`No cut-outs in ${dir}. Run: npm run cutouts -- make ${target}`);
  const signIn = await db.auth.signInWithPassword({ email, password: await askHidden("Team password: ") });
  if (signIn.error) throw new Error(`Sign-in failed: ${signIn.error.message}`);
  if ((await db.rpc("is_team")).data !== true) throw new Error(`${email} isn't on the team.`);
  const still = new Set((await needing()).map((p) => p.code));
  let saved = 0;
  for (const f of files) {
    const code = f.replace(".webp", "");
    if (!still.has(code)) { console.log(`  ${code}  already has a cut-out, left alone`); continue; }
    const path = `c/${crypto.randomUUID()}.webp`;
    const up = await db.storage.from(PHOTO.bucket).upload(path, readFileSync(`${dir}/${f}`), { contentType: "image/webp", cacheControl: PHOTO.cacheSeconds });
    if (up.error) { console.log(`  ${code}  upload failed: ${up.error.message}`); continue; }
    const { data, error } = await db.from("products").update({ cutout: path }).eq("code", code).is("cutout", null).select("code");
    if (error || !data.length) {
      await db.storage.from(PHOTO.bucket).remove([path]);
      console.log(`  ${code}  not saved${error ? `: ${error.message}` : " (it got a cut-out meanwhile)"}`);
      continue;
    }
    saved++;
    console.log(`  ${code}  saved`);
  }
  await db.auth.signOut();
  console.log(`\n${saved} cut-outs saved. They show in the shop after the next deploy or any dashboard save.`);
}

(mode === "make" ? make() : save()).then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
