// Product photo rules (D-011), shared by the browser editor and the seed script.
export const PHOTO = {
  width: 720,
  height: 900,
  maxBytes: 80 * 1024,
  // WebP quality steps, tried in order until the file fits maxBytes.
  qualities: [0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4],
  maxPerProduct: 4,
  bucket: "product-photos",
} as const;

// Center-crop rectangle (in source pixels) that fills the 4:5 target without distortion.
export function coverCrop(srcW: number, srcH: number, dstW: number = PHOTO.width, dstH: number = PHOTO.height) {
  if (srcW <= 0 || srcH <= 0) throw new RangeError("Image has no size");
  const target = dstW / dstH;
  if (srcW / srcH > target) {
    const w = Math.round(srcH * target);
    return { sx: Math.round((srcW - w) / 2), sy: 0, sw: w, sh: srcH };
  }
  const h = Math.round(srcW / target);
  return { sx: 0, sy: Math.round((srcH - h) / 2), sw: srcW, sh: h };
}
