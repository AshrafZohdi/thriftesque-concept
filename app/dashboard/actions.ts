"use server";
// Dashboard writes. Each checks the session and team membership first (requireTeam), validates input, writes with the
// signed-in user's session (so RLS applies too), then refreshes the cached shop pages it affects (D-021).
import { revalidatePath } from "next/cache";
import { isCode, isStatus, validateSettings, type SettingsInput } from "@/lib/dashboard";
import { PHOTO } from "@/lib/photo-spec";
import { requireTeam } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

function refreshProduct(code: string) {
  revalidatePath("/");
  revalidatePath(`/p/${code}`);
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
    })
    .eq("id", 1);
  if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  // Settings show on every page (strip, footer, bag), so refresh them all.
  revalidatePath("/", "layout");
  return { ok: true };
}
