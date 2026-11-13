// One product schema for the editor (React Hook Form) and the save action (server). Mirrors the database checks.
import { z } from "zod";
import { CATEGORIES, CONDITIONS, ERAS, MEASURE, STATUSES, type Category } from "./catalog";
import { PHOTO } from "./photo-spec";

const text = (max: number, label: string) => z.string().trim().max(max, `${label}: ${max} characters at most.`);
// Storage paths written by the editor: <folder>/<random>.<ext>, nothing that could escape the bucket. WebP normally;
// JPEG (photos) or PNG (cut-outs) when a browser can't encode WebP from a canvas.
const storagePath = z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.(webp|jpg|png)$/, "That photo path isn't valid.");

export const productSchema = z
  .object({
    name: text(120, "Name").min(1, "Give the piece a name."),
    brand: text(80, "Brand"),
    era: z.enum(ERAS, { message: "Choose an era." }),
    category: z.enum(CATEGORIES, { message: "Choose a category." }),
    size: text(20, "Size").min(1, "Add a size."),
    price: z.coerce.number({ message: "Add a price." }).int("Price: whole QAR only.").min(1, "Add a price.").max(999_999, "That price is too high."),
    condition: z.enum(CONDITIONS, { message: "Choose a condition." }),
    colour: text(40, "Colour"),
    // Flat measurements in cm. Empty means not measured.
    measurements: z.record(z.string(), z.union([z.literal(""), z.coerce.number().min(0, "Measurements can't be negative.").max(500, "Check that measurement.")])),
    status: z.enum(STATUSES),
    photos: z.array(storagePath).min(1, "Add a photo so customers can see the piece.").max(PHOTO.maxPerProduct, `${PHOTO.maxPerProduct} photos at most.`),
    cutout: storagePath.or(z.literal("")),
    description: text(1000, "Description"),
    stylingTip: text(300, "Styling tip"),
  })
  .superRefine((v, ctx) => {
    const allowed = MEASURE[v.category as Category];
    for (const k of Object.keys(v.measurements)) {
      if (!allowed.includes(k)) ctx.addIssue({ code: "custom", path: ["measurements", k], message: `${k} isn't measured for ${v.category}.` });
    }
  });

// A draft from a bulk upload (D-051): one photo, an optional cut-out, and whatever the AI suggested. Always hidden; the team
// adds price, size, condition and measurements in the editor before it can go live.
export const draftSchema = z.object({
  photo: storagePath,
  cutout: storagePath.optional(),
  name: text(120, "Name").optional(),
  category: z.enum(CATEGORIES).optional(),
  era: z.enum(ERAS).optional(),
  colour: text(40, "Colour").optional(),
  description: text(1000, "Description").optional(),
  stylingTip: text(300, "Styling tip").optional(),
});
export type DraftInput = z.input<typeof draftSchema>;

export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

// Database row from validated values. Empty strings become null; brand falls back to "Unbranded" like the mockup.
export function toProductRow(v: ProductValues) {
  const measurements = Object.fromEntries(Object.entries(v.measurements).filter(([, n]) => n !== "" && Number(n) > 0).map(([k, n]) => [k, Number(n)]));
  return {
    name: v.name,
    brand: v.brand || "Unbranded",
    era: v.era,
    category: v.category,
    size: v.size,
    price_qar: v.price,
    condition: v.condition,
    colour: v.colour || null,
    measurements,
    status: v.status,
    photos: v.photos,
    cutout: v.cutout || null,
    description: v.description || null,
    styling_tip: v.stylingTip || null,
  };
}

export const emptyProduct = (): ProductInput => ({
  name: "", brand: "", era: "90s", category: "Tops", size: "", price: "" as unknown as number, condition: "Very good",
  colour: "", measurements: {}, status: "hidden", photos: [], cutout: "", description: "", stylingTip: "",
});
