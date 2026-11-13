// Renders the home page's share card (public/og.jpg, 1200x630) from HTML in option F's look: sky, chrome heart, lime strip,
// Anton wordmark and three cut-outs. Run once after a design change: node scripts/make-og-image.mjs
// The fonts load from Google Fonts only while generating; the site itself serves the finished JPEG.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const cutout = (name) => `data:image/webp;base64,${readFileSync(`design/img/cutouts/${name}.webp`).toString("base64")}`;
const heart = readFileSync("app/icon.svg", "utf8").replace(/<rect[^>]*\/>/, ""); // the heart without its dark tile

const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:wght@700&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 1200px; height: 630px; overflow: hidden; position: relative;
    background: radial-gradient(120% 90% at 30% 20%, #d9efff 0%, #8ecbff 70%); font-family: "Space Mono", monospace }
  .strip { position: absolute; inset: 0 0 auto 0; height: 46px; background: #d6f84c; border-bottom: 2px solid #0d0d0f;
    display: flex; align-items: center; gap: 28px; padding-left: 24px; font: 700 20px/1 "Space Mono"; text-transform: uppercase; white-space: nowrap }
  .copy { position: absolute; left: 64px; top: 120px; width: 560px }
  .heart { width: 120px; height: 120px }
  h1 { font: 400 112px/0.9 Anton, sans-serif; text-transform: uppercase; color: #0d0d0f; margin-top: 18px }
  p { font: 700 26px/1.35 "Space Mono"; text-transform: uppercase; color: #0d0d0f; margin-top: 22px }
  .pieces { position: absolute; right: 16px; top: 70px; width: 520px; height: 560px }
  .pieces img { position: absolute; object-fit: contain; filter: drop-shadow(0 12px 18px rgba(13,13,15,.25)) }
</style></head><body>
  <div class="strip"><span>One of one +++</span><span>Order on WhatsApp +++</span><span>Doha, Qatar +++</span><span>Pre-loved +++</span></div>
  <div class="copy">
    <svg class="heart" viewBox="0 0 64 64">${heart.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
    <h1>Thriftesque</h1>
    <p>Pre-loved pieces,<br>one of each</p>
  </div>
  <div class="pieces">
    <img src="${cutout("denim-jacket")}" style="left:20px;top:20px;width:270px;height:280px;transform:rotate(-6deg)">
    <img src="${cutout("yellow-pinafore")}" style="left:240px;top:40px;width:280px;height:320px;transform:rotate(5deg)">
    <img src="${cutout("chelsea-boots")}" style="left:120px;top:330px;width:240px;height:190px;transform:rotate(-3deg)">
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: "png" });
await browser.close();
const jpg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
writeFileSync("public/og.jpg", jpg);
console.log(`public/og.jpg ${(jpg.length / 1024).toFixed(0)} KB`);
