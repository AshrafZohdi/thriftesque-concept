// Sample products, looks and settings shared by the local seed (scripts/seed.ts) and the production preview loader
// (scripts/demo.ts). The 21 products and photos come from design/ (CC0 photos).
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { PHOTO } from "../lib/photo-spec.ts";

export type SeedProduct = {
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

export const loadSeed = async (): Promise<SeedProduct[]> => JSON.parse(await readFile("design/seed-products.json", "utf8"));

export const cutoutFileFor = (photo: string) => photo.replace("design/img/", "design/img/cutouts/").replace(/\.jpg$/, ".webp");

export async function toWebp(path: string): Promise<{ data: Buffer; quality: number }> {
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

// Hand-picked sample looks (D-028). Marked source "team" so the shop never labels them as AI picks.
export const SAMPLE_LOOKS = [
  { title: "Denim day", note: "A patchwork knit over a denim midi skirt, with black Chelsea boots.", product_codes: ["TQ-0706", "TQ-0718", "TQ-0721"] },
  { title: "Stripes and dark denim", note: "A navy ringer tee with rigid straight jeans and white cut-out heels.", product_codes: ["TQ-0710", "TQ-0716", "TQ-0720"] },
  { title: "Leather and light wash", note: "The green leather biker over light wash jeans, with Chelsea boots.", product_codes: ["TQ-0702", "TQ-0717", "TQ-0721"] },
  { title: "Florals for dinner", note: "The blue floral sheath dress with white cut-out heels.", product_codes: ["TQ-0713", "TQ-0720"] },
];

// Sample delivery settings from the mockup, for the local seed. Placeholders until the client confirms (content inventory
// C-1, C-2, C-9). The preview loader leaves the WhatsApp number empty, so the live domain has no order buttons (D-044).
export const SAMPLE_SETTINGS = {
  whatsapp_number: "97400000000",
  drop_name: "Drop 07",
  delivery_fees: [
    ...["Al Sadd", "West Bay", "The Pearl", "Lusail", "Msheireb", "Al Waab", "Al Rayyan"].map((area) => ({ area, fee_qar: 15 })),
    ...["Al Wakra", "Al Khor", "Other"].map((area) => ({ area, fee_qar: 25 })),
  ],
};

// Local test data for sale prices and sections (D-060): one piece on sale, one section with pieces and one without (the shop
// must leave an empty section out).
export const SAMPLE_SALE: Record<string, number> = { "TQ-0710": 90 };
export const SAMPLE_SECTIONS = [
  { name: "Basics", codes: ["TQ-0709", "TQ-0710", "TQ-0717"] },
  { name: "Men's", codes: [] as string[] },
];
