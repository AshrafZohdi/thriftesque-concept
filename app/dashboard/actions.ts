"use server";
// Dashboard writes. Each checks the session and team membership first (requireTeam), validates input, writes with the
// signed-in user's session (so RLS applies too), then refreshes the cached shop pages it affects (D-021).
import { revalidatePath } from "next/cache";
import { isCode, isStatus, validateSettings, type SettingsInput } from "@/lib/dashboard";
import { looksPrompt, LOOKS_SCHEMA, validLooks, type LookPiece } from "@/lib/ai";
import { geminiJson } from "@/lib/gemini";
import { productSchema, toProductRow, type ProductInput } from "@/lib/product-schema";
import { PHOTO } from "@/lib/photo-spec";
import { detailsToRow } from "@/lib/shop-facts";
import { requireTeam } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

function refreshProduct(code: string) {
  revalidatePath("/");
  revalidatePath(`/p/${code}`);
  revalidatePath("/sitemap.xml");
}

export async function setStatus(code: string, status: string): Promise<Result> {
  if (!isCode(code) || !isStatus(status)) return { ok: false, error: "That change isn't valid." };
  const t = await requireTeam();
  if (!t.ok) return t;
  const { data, error } = await t.db.from("products").update({ status }).eq("code", code).select("code");
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  if (!data.length) return { ok: false, error: `${code} wasn't found. Refresh the page.` };
  refreshProduct(code);
  return { ok: true };
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
  const { error } = await t.db
    .from("settings")
    .update({
      whatsapp_number: v.value.whatsappNumber,
      drop_name: v.value.dropName,
      delivery_fees: v.value.deliveryFees.map((f) => ({ area: f.area, fee_qar: f.fee })),
      ...detailsToRow(v.value.details),
    })
    .eq("id", 1);
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  // Settings show on every page (strip, footer, bag, terms, privacy), so refresh them all.
  revalidatePath("/", "layout");
  return { ok: true };
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
