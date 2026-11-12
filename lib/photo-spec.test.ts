import { describe, expect, it } from "vitest";
import { PHOTO, coverCrop } from "./photo-spec";

describe("coverCrop", () => {
  it("keeps a 4:5 image whole", () => {
    expect(coverCrop(720, 900)).toEqual({ sx: 0, sy: 0, sw: 720, sh: 900 });
  });

  it("trims the sides of a wide photo, centred", () => {
    expect(coverCrop(4000, 3000)).toEqual({ sx: 800, sy: 0, sw: 2400, sh: 3000 });
  });

  it("trims top and bottom of a tall phone photo, centred", () => {
    const c = coverCrop(3024, 5376);
    expect(c.sw).toBe(3024);
    expect(c.sh).toBe(3780);
    expect(c.sy).toBe(798);
  });

  it("always matches the target ratio", () => {
    for (const [w, h] of [[1, 1], [1080, 1920], [5000, 200], [333, 777]]) {
      const c = coverCrop(w, h);
      expect(Math.abs(c.sw / c.sh - PHOTO.width / PHOTO.height)).toBeLessThan(0.01 + 1 / Math.min(c.sw, c.sh));
    }
  });

  it("rejects empty images", () => {
    expect(() => coverCrop(0, 100)).toThrow(RangeError);
  });
});

import { alphaBounds, hardenMask } from "./photo-spec";

describe("cut-out mask", () => {
  it("hardens the mask: background to 0, piece to 255, smooth between", () => {
    expect([...hardenMask([0, 0.29, 0.45, 0.61, 1])]).toEqual([0, 0, 128, 255, 255]);
  });
  it("finds the box around the piece", () => {
    const a = new Uint8ClampedArray(5 * 4);
    a[1 * 5 + 1] = 200; a[2 * 5 + 3] = 255;
    expect(alphaBounds(a, 5, 4)).toEqual({ x: 1, y: 1, w: 3, h: 2 });
    expect(alphaBounds(new Uint8ClampedArray(20), 5, 4)).toBeNull();
  });
});
