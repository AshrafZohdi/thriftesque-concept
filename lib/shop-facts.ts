// Facts about how the shop works, shown on the home page, the terms and the privacy page (D-046, D-048). The team edits
// them in the dashboard's settings; they're stored on the settings row. An empty one isn't confirmed yet: the legal pages
// say "To be confirmed", and the deploy refuses to leave preview mode (scripts/check-facts.ts).
export type ShopFact = { text: string; confirmed: boolean };

export type ShopDetails = {
  operatorName: string;
  contactEmail: string;
  deliveryText: string;
  paymentText: string;
  returnsText: string;
  reservedHoldText: string;
  orderRetentionText: string;
};

export const EMPTY_DETAILS: ShopDetails = {
  operatorName: "", contactEmail: "", deliveryText: "", paymentText: "", returnsText: "", reservedHoldText: "", orderRetentionText: "",
};

// Fixed facts that don't need the client.
export const LOCATION = "Doha, Qatar";
export const SIZING = "Vintage sizes run differently. Every piece lists flat measurements in cm.";

// The approved mockup's wording, shown until the team writes their own. Still marked unconfirmed on the legal pages.
const FALLBACK = {
  operator: "Thriftesque, a secondhand clothing shop in Doha, Qatar",
  delivery: "Across Qatar. Doha orders arrive within 24 hours. The fee is added to your order.",
  payment: "Cash on delivery or bank transfer. We share details when we confirm.",
};

const fact = (text: string, fallback = ""): ShopFact => (text.trim() ? { text: text.trim(), confirmed: true } : { text: fallback, confirmed: false });

export function shopFacts(d: ShopDetails) {
  return {
    operator: fact(d.operatorName, FALLBACK.operator),
    contactEmail: fact(d.contactEmail),
    delivery: fact(d.deliveryText, FALLBACK.delivery),
    payment: fact(d.paymentText, FALLBACK.payment),
    returns: fact(d.returnsText),
    reservedHold: fact(d.reservedHoldText),
    orderRetention: fact(d.orderRetentionText),
  };
}

// Dashboard labels, in form order. Also used to list what's still missing.
export const DETAIL_LABELS: Record<keyof ShopDetails, string> = {
  operatorName: "Who runs the shop",
  contactEmail: "Contact email",
  deliveryText: "Delivery",
  paymentText: "Payment",
  returnsText: "Returns and exchanges",
  reservedHoldText: "How long a reserved piece is held",
  orderRetentionText: "How long order chats are kept",
};

export function missingDetails(d: ShopDetails): string[] {
  return (Object.keys(DETAIL_LABELS) as (keyof ShopDetails)[]).filter((k) => !d[k].trim()).map((k) => DETAIL_LABELS[k]);
}

// When the legal pages' fixed wording last changed. Update it with any change to app/terms or app/privacy.
export const LEGAL_UPDATED = "13 November 2026";

// Columns on the settings row, and the mapping both ways.
export const DETAIL_COLUMNS = "operator_name,contact_email,delivery_text,payment_text,returns_text,reserved_hold_text,order_retention_text" as const;

type DetailRow = {
  operator_name?: string | null; contact_email?: string | null; delivery_text?: string | null; payment_text?: string | null;
  returns_text?: string | null; reserved_hold_text?: string | null; order_retention_text?: string | null;
};

export function detailsFromRow(r: DetailRow | null | undefined): ShopDetails {
  return {
    operatorName: r?.operator_name ?? "",
    contactEmail: r?.contact_email ?? "",
    deliveryText: r?.delivery_text ?? "",
    paymentText: r?.payment_text ?? "",
    returnsText: r?.returns_text ?? "",
    reservedHoldText: r?.reserved_hold_text ?? "",
    orderRetentionText: r?.order_retention_text ?? "",
  };
}

export function detailsToRow(d: ShopDetails) {
  return {
    operator_name: d.operatorName,
    contact_email: d.contactEmail,
    delivery_text: d.deliveryText,
    payment_text: d.paymentText,
    returns_text: d.returnsText,
    reserved_hold_text: d.reservedHoldText,
    order_retention_text: d.orderRetentionText,
  };
}

// Cleans what the team typed, or returns the first problem in plain words. Limits match the database checks.
export function validateDetails(input: ShopDetails): { ok: true; value: ShopDetails } | { ok: false; error: string } {
  const v = Object.fromEntries((Object.keys(EMPTY_DETAILS) as (keyof ShopDetails)[]).map((k) => [k, String(input?.[k] ?? "").trim()])) as ShopDetails;
  const max: Record<keyof ShopDetails, number> = {
    operatorName: 120, contactEmail: 120, deliveryText: 400, paymentText: 400, returnsText: 600, reservedHoldText: 120, orderRetentionText: 120,
  };
  for (const k of Object.keys(max) as (keyof ShopDetails)[]) {
    if (v[k].length > max[k]) return { ok: false, error: `${DETAIL_LABELS[k]}: ${max[k]} characters at most.` };
    if (/—/.test(v[k])) v[k] = v[k].replace(/\s*—\s*/g, ", ");
  }
  if (v.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.contactEmail)) return { ok: false, error: "Contact email: that doesn't look like an email address." };
  return { ok: true, value: v };
}
