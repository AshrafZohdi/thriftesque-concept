// Hero from option F: the newest live piece with a cut-out floats on the sky, next to the headline.
import { ChromeHeart, ChromeStar } from "@/components/Chrome";
import type { ShopProduct } from "@/lib/shop-model";
import s from "./shop.module.css";

export function Hero({ piece, liveCount, dropName, firstSection }: { piece: ShopProduct | undefined; liveCount: number; dropName: string; firstSection: "looks" | "shop" }) {
  return (
    <section className={s.hero}>
      <div className={s.heroPic}>
        <ChromeHeart className={s.heart} />
        <ChromeStar className={s.star} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {piece?.cutout && <img className={s.heroPiece} src={piece.cutout} alt={piece.name} draggable={false} />}
        <a className={s.tagLime} href="#shop">Check new arrivals</a>
      </div>
      <div className={s.heroCopy}>
        <span className={`${s.chipOut} mono`}>{dropName ? `${dropName} · ` : ""}{liveCount} pieces live</span>
        <h1 className="display">Pre-loved pieces, one of each.</h1>
        <p>Hand-picked secondhand clothing in Doha, checked and measured. When a piece is gone, it&apos;s gone for good.</p>
        <div className={s.cta}>
          {firstSection === "looks" && <a className={`${s.btn} ${s.primary}`} href="#looks">See the looks</a>}
          <a className={`${s.btn} ${firstSection === "looks" ? s.secondary : s.primary}`} href="#shop">Shop the drop</a>
        </div>
        <a className={`${s.scrollBar} mono`} href={`#${firstSection}`}><span>Scroll down</span><span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
