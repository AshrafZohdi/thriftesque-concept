// Seeds the LOCAL database with the 21 sample products and photos from design/. Safe to run repeatedly.
// Usage: npm run seed   (reads .env.local; refuses to run against a non-local Supabase)
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { PHOTO } from "../lib/photo-spec.ts";
import { DEV_STRANGER, DEV_TEAM } from "./dev-accounts.ts";

type SeedProduct = {
  code: string;
  name: string;
  brand: string;
  era: string;
  category: string;
  size: string;
  price_qar: number;
  condition: string;
  measurements_cm: Record<string, number>;
  status: string;
  photo: string;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (run npm run env:local).");

const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  throw new Error(`Refusing to seed ${host}: sample data is for the local database only.`);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

async function toWebp(path: string): Promise<{ data: Buffer; quality: number }> {
  const input = await readFile(path);
  for (const q of PHOTO.qualities) {
    const data = await sharp(input)
      .rotate()
      .resize(PHOTO.width, PHOTO.height, { fit: "cover", position: "centre" })
      .webp({ quality: Math.round(q * 100) })
      .toBuffer();
    if (data.length <= PHOTO.maxBytes) return { data, quality: q };
  }
  throw new Error(`${path} is still over ${PHOTO.maxBytes} bytes at the lowest quality`);
}

// Hand-picked sample looks for local development (D-028). Marked source "team" so the shop never labels them as AI picks.
const SAMPLE_LOOKS = [
  { title: "Denim day", note: "A patchwork knit over a denim midi skirt, with black Chelsea boots.", product_codes: ["TQ-0706", "TQ-0718", "TQ-0721"] },
  { title: "Stripes and dark denim", note: "A navy ringer tee with rigid straight jeans and white cut-out heels.", product_codes: ["TQ-0710", "TQ-0716", "TQ-0720"] },
  { title: "Leather and light wash", note: "The green leather biker over light wash jeans, with Chelsea boots.", product_codes: ["TQ-0702", "TQ-0717", "TQ-0721"] },
  { title: "Florals for dinner", note: "The blue floral sheath dress with white cut-out heels.", product_codes: ["TQ-0713", "TQ-0720"] },
];

// Sample delivery settings from the mockup. Placeholders until the client confirms (content inventory C-1, C-2, C-9).
const SAMPLE_SETTINGS = {
  whatsapp_number: "97400000000",
  drop_name: "Drop 07",
  delivery_fees: [
    ...["Al Sadd", "West Bay", "The Pearl", "Lusail", "Msheireb", "Al Waab", "Al Rayyan"].map((area) => ({ area, fee_qar: 15 })),
    ...["Al Wakra", "Al Khor", "Other"].map((area) => ({ area, fee_qar: 25 })),
  ],
};

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
  const seed: SeedProduct[] = JSON.parse(await readFile("design/seed-products.json", "utf8"));
  let bytes = 0;

  for (const p of seed) {
    const { data, quality } = await toWebp(p.photo);
    bytes += data.length;
    const path = `${p.code}/seed-cover.webp`;
    const up = await db.storage.from(PHOTO.bucket).upload(path, data, { contentType: "image/webp", upsert: true });
    if (up.error) throw new Error(`Upload ${path}: ${up.error.message}`);

    // Cut-outs were made once with macOS Vision and live in design/img/cutouts (D-027).
    const cutoutPath = `${p.code}/seed-cutout.webp`;
    const cutoutFile = p.photo.replace("design/img/", "design/img/cutouts/").replace(/\.jpg$/, ".webp");
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

  const settings = await db.from("settings").update(SAMPLE_SETTINGS).eq("id", 1);
  if (settings.error) throw new Error(`Settings: ${settings.error.message}`);

  const cleared = await db.from("looks").delete().eq("source", "team");
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
