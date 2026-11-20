"use server";
// Dashboard writes. Each checks the session and team membership first (requireTeam), validates input, writes with the
// signed-in user's session (so RLS applies too), then refreshes the cached shop pages it affects (D-021).
import { revalidatePath } from "next/cache";
import { isCode, isStatus, missingForShop, validateSections, validateSettings, type SectionInput, type SettingsInput } from "@/lib/dashboard";
import { aboutPhotosFrom } from "@/lib/about";
import { looksPrompt, LOOKS_SCHEMA, validLooks, type LookPiece } from "@/lib/ai";
import { geminiJson } from "@/lib/gemini";
import { draftSchema, productSchema, toProductRow, type DraftInput, type ProductInput } from "@/lib/product-schema";
import { PHOTO } from "@/lib/photo-spec";
import { detailsToRow } from "@/lib/shop-facts";
import { requireTeam } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

function refreshProduct(code: string) {
  revalidatePath("/");
  revalidatePath(`/p/${code}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

export async function setStatus(code: string, status: string): Promise<Result> {
  if (!isCode(code) || !isStatus(status)) return { ok: false, error: "That change isn't valid." };
  const t = await requireTeam();
  if (!t.ok) return t;
  if (status !== "hidden") {
    const cur = await t.db.from("products").select("price_qar,photos").eq("code", code).maybeSingle();
    const missing = cur.data ? missingForShop(cur.data) : [];
    if (missing.length) return { ok: false, error: `${code} needs ${missing.join(", ")} before it can show in the shop. Open it with Edit.` };
  }
  const { data, error } = await t.db.from("products").update({ status }).eq("code", code).select("code");
  if (error) return { ok: false, error: error.code === "23514" ? `${code} needs a price and a photo before it can show in the shop.` : `Couldn't save: ${error.message}` };
  if (!data.length) return { ok: false, error: `${code} wasn't found. Refresh the page.` };
  refreshProduct(code);
  return { ok: true };
}

// Puts several hidden pieces live at once (D-066). Pieces still missing a price or photo are left hidden and reported.
export async function makeLive(codes: string[]): Promise<{ ok: true; live: string[]; skipped: string[] } | { ok: false; error: string }> {
  const list = [...new Set(Array.isArray(codes) ? codes : [])];
  if (!list.length || list.length > 200 || !list.every(isCode)) return { ok: false, error: "That selection isn't valid. Refresh the page." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const cur = await t.db.from("products").select("code,price_qar,photos,status").in("code", list);
  if (cur.error) return { ok: false, error: `Couldn't check the pieces: ${cur.error.message}` };
  const ready = cur.data.filter((p) => p.status === "hidden" && missingForShop(p).length === 0).map((p) => p.code);
  const skipped = list.filter((c) => !ready.includes(c));
  if (ready.length) {
    const { error } = await t.db.from("products").update({ status: "live" }).in("code", ready).eq("status", "hidden");
    if (error) return { ok: false, error: `Couldn't make them live: ${error.message}` };
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    for (const c of ready) revalidatePath(`/p/${c}`);
  }
  return { ok: true, live: ready, skipped };
}

export async function deleteProduct(code: string): Promise<Result> {
  if (!isCode(code)) return { ok: false, error: "That product code isn't valid." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const { data, error } = await t.db.from("products").delete().eq("code", code).select("photos, cutout");
  if (error) return { ok: false, error: `Couldn't delete: ${error.message}` };
  if (!data.length) return { ok: false, error: `${code} wasn't found. Refresh the page.` };
  // Photos go too, so storage doesn't fill up with orphans (1 GB on the free plan).
  const paths = data.flatMap((r) => [...r.photos, ...(r.cutout ? [r.cutout] : [])]);
  if (paths.length) await t.db.storage.from(PHOTO.bucket).remove(paths);
  refreshProduct(code);
  return { ok: true };
}

export async function saveSettings(input: SettingsInput): Promise<Result> {
  const v = validateSettings(input);
  if (!v.ok) return v;
  const t = await requireTeam();
  if (!t.ok) return t;
  const before = await t.db.from("settings").select("about_photos").eq("id", 1).single();
  const { error } = await t.db
    .from("settings")
    .update({
      whatsapp_number: v.value.whatsappNumber,
      drop_name: v.value.dropName,
      delivery_fees: v.value.deliveryFees.map((f) => ({ area: f.area, fee_qar: f.fee })),
      ...detailsToRow(v.value.details),
      about_text: v.value.about,
      about_photos: v.value.aboutPhotos,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  // About photos taken off the page are deleted, so storage doesn't fill up (1 GB on the free plan).
  const kept = new Set(v.value.aboutPhotos.map((p) => p.path));
  const dropped = aboutPhotosFrom(before.data?.about_photos).map((p) => p.path).filter((p) => !kept.has(p));
  if (dropped.length) await t.db.storage.from(PHOTO.bucket).remove(dropped);
  // Settings show on every page (strip, footer, bag, terms, privacy, about, FAQ), so refresh them all, and the AI summary.
  revalidatePath("/", "layout");
  revalidatePath("/llms.txt");
  return { ok: true };
}

// Saves the whole list of sections in the order given (D-060). Ones left out are removed; the database then takes them off
// their pieces, and the pieces stay.
export async function saveSections(input: SectionInput[]): Promise<{ ok: true; sections: { id: string; name: string }[] } | { ok: false; error: string }> {
  const v = validateSections(input);
  if (!v.ok) return v;
  const t = await requireTeam();
  if (!t.ok) return t;
  const cur = await t.db.from("sections").select("id");
  if (cur.error) return { ok: false, error: `Couldn't save: ${cur.error.message}` };
  const keep = new Set(v.value.flatMap((s) => (s.id ? [s.id] : [])));
  const gone = cur.data.map((r) => r.id).filter((id) => !keep.has(id));
  if (gone.length) {
    const del = await t.db.from("sections").delete().in("id", gone);
    if (del.error) return { ok: false, error: `Couldn't remove a section: ${del.error.message}` };
  }
  for (const [position, s] of v.value.entries()) {
    const { error } = s.id
      ? await t.db.from("sections").update({ name: s.name, position }).eq("id", s.id)
      : await t.db.from("sections").insert({ name: s.name, position });
    if (error) return { ok: false, error: error.code === "23505" ? `"${s.name}" already exists.` : `Couldn't save "${s.name}": ${error.message}` };
  }
  revalidatePath("/");
  // The saved list with the new sections' ids, so the panel carries on from it.
  const saved = await t.db.from("sections").select("id,name").order("position").order("created_at");
  if (saved.error) return { ok: false, error: `Saved, but couldn't reload the list: ${saved.error.message}` };
  return { ok: true, sections: saved.data };
}

// Creates (code null) or updates a product. New products get the next TQ code from the database (D-006).
export async function saveProduct(code: string | null, input: ProductInput): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (code !== null && !isCode(code)) return { ok: false, error: "That product code isn't valid." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const row = toProductRow(parsed.data);

  if (code === null) {
    const { data, error } = await t.db.from("products").insert(row).select("code").single();
    if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
    refreshProduct(data.code);
    return { ok: true, code: data.code };
  }

  const before = await t.db.from("products").select("photos, cutout").eq("code", code).maybeSingle();
  if (before.error || !before.data) return { ok: false, error: `${code} wasn't found. Refresh the page.` };
  const { error } = await t.db.from("products").update(row).eq("code", code);
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  // Photos taken out in the editor are deleted from storage, so they don't count against the 1 GB.
  const keep = new Set([...row.photos, ...(row.cutout ? [row.cutout] : [])]);
  const gone = [...before.data.photos, ...(before.data.cutout ? [before.data.cutout] : [])].filter((p) => !keep.has(p));
  if (gone.length) await t.db.storage.from(PHOTO.bucket).remove(gone);
  refreshProduct(code);
  return { ok: true, code };
}

// "Suggest looks" (D-028): sends live stock as text (product facts only, never customer data), keeps only suggestions that pass
// the slot rules, and saves them as drafts for the team to publish. Costs one Gemini call per press, nothing per shopper.
export async function suggestLooks(): Promise<{ ok: true; added: number; rejected: number } | { ok: false; error: string }> {
  const t = await requireTeam();
  if (!t.ok) return t;
  const [stock, existing] = await Promise.all([
    t.db.from("products").select("code,name,category,colour,era,size").eq("status", "live").not("cutout", "is", null),
    t.db.from("looks").select("product_codes"),
  ]);
  if (stock.error || existing.error) return { ok: false, error: "Couldn't read the stock. Try again." };
  const pieces = stock.data as LookPiece[];
  if (pieces.length < 2) return { ok: false, error: "Add more live pieces with cut-outs first." };

  const r = await geminiJson([{ text: looksPrompt(pieces) }], LOOKS_SCHEMA, { maxOutputTokens: 4096, timeoutMs: 40_000 });
  if (!r.ok) return { ok: false, error: r.error };
  const { looks, rejected } = validLooks(r.json, pieces, existing.data.map((l) => l.product_codes));
  if (looks.length) {
    const ins = await t.db.from("looks").insert(looks.map((l) => ({ title: l.title, note: l.note, product_codes: l.codes, source: "ai" as const, status: "draft" as const })));
    if (ins.error) return { ok: false, error: `Couldn't save the suggestions: ${ins.error.message}` };
  }
  return { ok: true, added: looks.length, rejected };
}

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export async function setLookStatus(id: string, status: "draft" | "published"): Promise<Result> {
  if (!isUuid(id) || (status !== "draft" && status !== "published")) return { ok: false, error: "That change isn't valid." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const { data, error } = await t.db.from("looks").update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  if (!data.length) return { ok: false, error: "That look wasn't found. Refresh the page." };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteLook(id: string): Promise<Result> {
  if (!isUuid(id)) return { ok: false, error: "That look isn't valid." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const { error } = await t.db.from("looks").delete().eq("id", id);
  if (error) return { ok: false, error: `Couldn't delete: ${error.message}` };
  revalidatePath("/");
  return { ok: true };
}

// One hidden draft per photo from a bulk upload (D-051). Missing details stay empty for the team to fill in; the database
// keeps it hidden until they do. Hidden pieces aren't in the shop, so no pages need refreshing.
export async function createDraft(input: DraftInput): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That photo couldn't be saved." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const v = parsed.data;
  const { data, error } = await t.db
    .from("products")
    .insert({
      name: v.name || "Untitled draft",
      status: "hidden",
      photos: [v.photo],
      cutout: v.cutout ?? null,
      category: v.category ?? null,
      era: v.era ?? null,
      colour: v.colour || null,
      description: v.description || null,
      styling_tip: v.stylingTip || null,
    })
    .select("code")
    .single();
  if (error) return { ok: false, error: `Couldn't save the draft: ${error.message}` };
  return { ok: true, code: data.code };
}

const STORAGE_PATH = /^[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.(webp|jpg|png)$/;

// Saves a cut-out made in the team's browser for a piece that had none (D-053, "Make cut-outs"). The piece then appears in the
// outfit builder and can be used in looks.
export async function saveCutout(code: string, path: string): Promise<Result> {
  if (!isCode(code) || !STORAGE_PATH.test(path)) return { ok: false, error: "That cut-out isn't valid." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const { data, error } = await t.db.from("products").update({ cutout: path }).eq("code", code).select("code");
  if (error) return { ok: false, error: `Couldn't save the cut-out: ${error.message}` };
  if (!data.length) return { ok: false, error: `${code} wasn't found.` };
  refreshProduct(code);
  return { ok: true };
}
