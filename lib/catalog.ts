// Fixed lists from the approved mockup (design/mockup-source.html). The database checks the same values.

export const CATEGORIES = ["Outerwear", "Knitwear", "Tops", "Dresses", "Bottoms", "Shoes", "Bags"] as const;
export const ERAS = ["70s", "80s", "90s", "Y2K", "2000s", "2010s"] as const;
export const CONDITIONS = ["Excellent", "Very good", "Good"] as const;
export const STATUSES = ["live", "reserved", "sold", "hidden"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Era = (typeof ERAS)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Status = (typeof STATUSES)[number];

// Flat measurements in cm. Keys shown in the editor and product details, in this order.
export const MEASURE: Record<Category, readonly string[]> = {
  Outerwear: ["Pit to pit", "Length", "Sleeve"],
  Knitwear: ["Pit to pit", "Length", "Sleeve"],
  Tops: ["Pit to pit", "Length"],
  Dresses: ["Bust", "Waist", "Length"],
  Bottoms: ["Waist", "Length", "Inseam"],
  Shoes: ["Insole", "Heel height"],
  Bags: ["Width", "Height", "Depth"],
};

// Shown under the details table. Owner to confirm the wording (content inventory C-12).
export const CONDITION_NOTE: Record<Condition, string> = {
  Excellent: "Barely worn, no flaws we could find.",
  "Very good": "Light wear from use, nothing that shows when worn.",
  Good: "Visible wear such as fading or a small mark. Shown in photos.",
};

// Product codes look like TQ-0722.
export function formatCode(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`Invalid product number: ${n}`);
  return `TQ-${String(n).padStart(4, "0")}`;
}

export function codeNumber(code: string): number {
  const m = /^TQ-(\d{4,})$/.exec(code);
  return m ? Number(m[1]) : 0;
}
