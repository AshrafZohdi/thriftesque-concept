"use client";
// Browser image work for the product editor: product photos (4:5, 720x900, 80 KB or less) and cut-outs (D-011, D-036).
import { CUTOUT, PHOTO, alphaBounds, coverCrop, hardenMask } from "./photo-spec";

type Encoded = { blob: Blob; ext: "webp" | "jpg" | "png" };

const blobOf = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't encode the image."))), type, q));

async function decode(file: Blob): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file, such as a JPG or PNG.");
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't open that image. Try a JPG or PNG.");
  }
}

// Crops to 4:5 around the centre, resizes to 720x900 and steps quality down until it fits 80 KB.
export async function toProductPhoto(file: Blob): Promise<Encoded> {
  const img = await decode(file);
  const c = document.createElement("canvas");
  c.width = PHOTO.width;
  c.height = PHOTO.height;
  const { sx, sy, sw, sh } = coverCrop(img.width, img.height);
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, sx, sy, sw, sh, 0, 0, PHOTO.width, PHOTO.height);
  img.close();
  let last: Blob | null = null;
  for (const q of PHOTO.qualities) {
    last = await blobOf(c, "image/webp", q);
    // Browsers that can't encode WebP hand back a PNG; use JPEG then.
    if (last.type !== "image/webp") break;
    if (last.size <= PHOTO.maxBytes) return { blob: last, ext: "webp" };
  }
  if (last?.type === "image/webp") return { blob: last, ext: "webp" };
  for (const q of PHOTO.qualities) {
    last = await blobOf(c, "image/jpeg", q);
    if (last.size <= PHOTO.maxBytes) break;
  }
  return { blob: last!, ext: "jpg" };
}

let worker: Worker | null = null;
let nextId = 0;

// Runs the background-removal model in a worker so the editor stays responsive. The first call downloads the model (44 MB).
function runModel(pixels: Float32Array): Promise<Float32Array> {
  worker ??= new Worker(new URL("./cutout.worker.ts", import.meta.url), { type: "module" });
  const id = ++nextId;
  return new Promise((ok, no) => {
    const onMsg = (e: MessageEvent<{ id: number; mask?: Float32Array; error?: string }>) => {
      if (e.data.id !== id) return;
      worker!.removeEventListener("message", onMsg);
      if (e.data.mask) ok(e.data.mask);
      else no(new Error(e.data.error ?? "Background removal failed."));
    };
    worker!.addEventListener("message", onMsg);
    worker!.postMessage({ id, pixels }, [pixels.buffer]);
  });
}

// Removes the background from a photo, keeps only the piece, trims it and saves it with transparency.
export async function toCutout(file: Blob, opts: { fromModel: boolean }): Promise<Encoded> {
  const img = await decode(file);
  const scale = Math.min(1, 900 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  img.close();
  const data = g.getImageData(0, 0, w, h);

  if (opts.fromModel) {
    // The model expects 1024x1024, RGB scaled to 0..1, channels first.
    const S = CUTOUT.size;
    const sc = document.createElement("canvas");
    sc.width = S;
    sc.height = S;
    sc.getContext("2d")!.drawImage(c, 0, 0, S, S);
    const px = sc.getContext("2d")!.getImageData(0, 0, S, S).data;
    const input = new Float32Array(3 * S * S);
    for (let i = 0; i < S * S; i++) for (let ch = 0; ch < 3; ch++) input[ch * S * S + i] = px[i * 4 + ch] / 255;
    const mask = await runModel(input);
    // Scale the mask back to the photo, then harden it.
    const m = document.createElement("canvas");
    m.width = S;
    m.height = S;
    const md = new ImageData(S, S);
    const alpha = hardenMask(mask);
    for (let i = 0; i < S * S; i++) md.data[i * 4 + 3] = alpha[i];
    m.getContext("2d")!.putImageData(md, 0, 0);
    const scaled = document.createElement("canvas");
    scaled.width = w;
    scaled.height = h;
    scaled.getContext("2d")!.drawImage(m, 0, 0, w, h);
    const a = scaled.getContext("2d")!.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) data.data[i * 4 + 3] = Math.min(data.data[i * 4 + 3], a[i * 4 + 3]);
    g.putImageData(data, 0, 0);
  }

  // Trim to the piece and fit within 600px.
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = data.data[i * 4 + 3];
  const box = alphaBounds(alpha, w, h);
  if (!box || box.w * box.h < w * h * 0.02) throw new Error("Couldn't find the piece in that photo. Try one with a plain background.");
  const fit = Math.min(1, CUTOUT.maxSide / Math.max(box.w, box.h));
  const out = document.createElement("canvas");
  out.width = Math.round(box.w * fit);
  out.height = Math.round(box.h * fit);
  out.getContext("2d")!.drawImage(c, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
  const webp = await blobOf(out, "image/webp", 0.82);
  if (webp.type === "image/webp") return { blob: webp, ext: "webp" };
  return { blob: await blobOf(out, "image/png"), ext: "png" };
}
