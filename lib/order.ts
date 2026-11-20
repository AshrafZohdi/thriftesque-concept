// The bag's WhatsApp order: fee, totals and the message text. Pure, so the exact message is unit tested.
import type { ShopProduct, ShopSettings } from "./shop-model";

export type OrderForm = { name: string; mode: "delivery" | "pickup"; area: string };

export function deliveryFee(settings: ShopSettings, form: OrderForm): number | null {
  if (form.mode === "pickup") return 0;
  return settings.deliveryFees.find((f) => f.area === form.area)?.fee ?? null;
}

export function lowestFee(settings: ShopSettings): number | null {
  return settings.deliveryFees.length ? Math.min(...settings.deliveryFees.map((f) => f.fee)) : null;
}

export function orderTotals(items: Pick<ShopProduct, "price">[], settings: ShopSettings, form: OrderForm) {
  const subtotal = items.reduce((t, p) => t + p.price, 0);
  const fee = deliveryFee(settings, form);
  return { subtotal, fee, total: subtotal + (fee ?? 0) };
}

// What's still missing before the order can be sent, as the hint shown under the button. null means ready.
export function orderBlocker(items: unknown[], settings: ShopSettings, form: OrderForm): string | null {
  if (!items.length) return "Add a piece to your bag first.";
  if (!form.name.trim()) return "Add your name to send the order.";
  if (form.mode === "delivery" && deliveryFee(settings, form) === null) return "Choose your area to send the order.";
  return null;
}

export function orderMessage(items: Pick<ShopProduct, "name" | "size" | "price" | "code">[], settings: ShopSettings, form: OrderForm): string {
  const { subtotal, fee, total } = orderTotals(items, settings, form);
  const lines = items.map((p, i) => `${i + 1}. ${p.name}${p.size ? ` (size ${p.size})` : ""}, ${p.price} QAR [${p.code}]`);
  return [
    "Hi Thriftesque! I'd like to order:",
    "",
    ...lines,
    "",
    `Subtotal: ${subtotal} QAR`,
    form.mode === "delivery" ? `Delivery: ${fee ?? 0} QAR` : "Pickup: free",
    `Total: ${total} QAR`,
    "",
    `Name: ${form.name.trim() || "-"}`,
    form.mode === "delivery" ? `Deliver to: ${form.area || "-"}` : "I'll pick up",
  ].join("\n");
}

export function outfitMessage(items: Pick<ShopProduct, "name" | "size" | "price" | "code">[], lookTitle?: string): string {
  const total = items.reduce((t, p) => t + p.price, 0);
  return [
    `Hi Thriftesque, is this ${lookTitle ? `look still available? (${lookTitle})` : "outfit still available?"}`,
    "",
    ...items.map((p, i) => `${i + 1}. ${p.name}${p.size ? ` (size ${p.size})` : ""}, ${p.price} QAR [${p.code}]`),
    "",
    `Total: ${total} QAR`,
  ].join("\n");
}
