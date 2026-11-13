// Shop data for server components. Pages that use it are cached and refreshed when the dashboard saves (D-021).
import { cache } from "react";
import { DETAIL_COLUMNS, detailsFromRow } from "@/lib/shop-facts";
import { publicDb, photoUrl } from "@/lib/supabase/public";
import {
  SHOP_PRODUCT_COLUMNS, sortForShop, toShopLook, toShopProduct, visibleLooks,
  type ShopLook, type ShopProduct, type ShopSettings,
} from "@/lib/shop-model";

function fail(what: string, error: { message: string }): never {
  throw new Error(`Couldn't load ${what}: ${error.message}`);
}

function toSettings(row: ({ whatsapp_number: string; drop_name: string; delivery_fees: unknown } & Parameters<typeof detailsFromRow>[0]) | null): ShopSettings {
  const fees = Array.isArray(row?.delivery_fees) ? row.delivery_fees : [];
  return {
    whatsappNumber: row?.whatsapp_number ?? "",
    dropName: row?.drop_name ?? "",
    deliveryFees: fees
      .map((f) => ({ area: String(f?.area ?? ""), fee: Number(f?.fee_qar) }))
      .filter((f) => f.area && Number.isFinite(f.fee) && f.fee >= 0),
    details: detailsFromRow(row),
  };
}

// cache(): metadata and page share one set of queries per render.
export const getShop = cache(async function getShop(): Promise<{ products: ShopProduct[]; looks: ShopLook[]; settings: ShopSettings }> {
  const db = publicDb();
  const [products, looks, settings] = await Promise.all([
    db.from("products").select(SHOP_PRODUCT_COLUMNS).neq("status", "hidden"),
    db.from("looks").select("id,title,note,product_codes,source").eq("status", "published").order("created_at", { ascending: false }),
    db.from("settings").select(`whatsapp_number,drop_name,delivery_fees,${DETAIL_COLUMNS}`).eq("id", 1).maybeSingle(),
  ]);
  if (products.error) fail("products", products.error);
  if (looks.error) fail("looks", looks.error);
  if (settings.error) fail("settings", settings.error);

  const list = sortForShop(products.data.map((r) => toShopProduct(r, photoUrl)).filter((p): p is ShopProduct => p !== null));
  const byCode = new Map(list.map((p) => [p.code, p]));
  return { products: list, looks: visibleLooks(looks.data.map(toShopLook), byCode), settings: toSettings(settings.data) };
});
