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

// Background removal for cut-outs (D-036): ormbg, Apache-2.0, int8 (44 MB), run in the team's browser, never on our servers.
export const CUTOUT = {
  modelUrl: "https://huggingface.co/onnx-community/ormbg-ONNX/resolve/main/onnx/model_quantized.onnx",
  size: 1024,
  // Mask hardening: below lo is background, above hi is the piece, smooth in between.
  lo: 0.3,
  hi: 0.6,
  maxSide: 600,
} as const;

// Alpha from a model mask (0..1), hardened with a smoothstep between lo and hi.
export function hardenMask(mask: ArrayLike<number>, lo: number = CUTOUT.lo, hi: number = CUTOUT.hi): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < mask.length; i++) {
    const t = Math.min(1, Math.max(0, (mask[i] - lo) / (hi - lo)));
    out[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return out;
}

// Smallest box holding every pixel whose alpha is above the threshold, or null when nothing is.
export function alphaBounds(alpha: ArrayLike<number>, w: number, h: number, threshold = 16) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[y * w + x] > threshold) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

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
