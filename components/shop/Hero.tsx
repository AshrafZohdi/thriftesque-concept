// Hero from option F: the newest live piece with a cut-out floats on the sky, next to the headline.
import { ChromeHeart, ChromeStar } from "@/components/Chrome";
import type { ShopProduct } from "@/lib/shop-model";
import s from "./shop.module.css";

export function Hero({ piece, liveCount, dropName }: { piece: ShopProduct | undefined; liveCount: number; dropName: string }) {
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
        <p>Hand-picked secondhand clothing, checked and measured. When a piece is gone, it&apos;s gone for good.</p>
        <div className={s.cta}>
          <a className={`${s.btn} ${s.primary}`} href="#shop">Shop the drop</a>
          <a className={`${s.btn} ${s.secondary}`} href="#how">How to order</a>
        </div>
        <a className={`${s.scrollBar} mono`} href="#shop"><span>Scroll down</span><span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
