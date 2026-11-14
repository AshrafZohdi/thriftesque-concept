"use client";
// Looks (D-028): boards of cut-out pieces that go together. Shop the whole look, remix it in the builder, or ask about it.
// The "AI picks" label only shows for looks the AI suggested (source "ai"), so labels follow the data.
import { useState } from "react";
import { ChromeHeart } from "@/components/Chrome";
import { outfitMessage } from "@/lib/order";
import { boardLayout } from "@/lib/board";
import type { ShopLook, ShopProduct } from "@/lib/shop-model";
import { waLink } from "@/lib/wa";
import { Overlay } from "./Overlay";
import { useShop } from "./ShopProvider";
import l from "./looks.module.css";
import s from "./shop.module.css";

function Board({ pieces, big }: { pieces: ShopProduct[]; big?: boolean }) {
  const spots = boardLayout(pieces);
  return (
    <div className={`${l.board} ${big ? l.big : ""}`} aria-hidden="true">
      <ChromeHeart className={l.heart} />
      {pieces.map((p) => {
        const spot = spots.get(p.code);
        if (!spot) return null;
        const [x, y, w, h, r] = spot;
        return (
          <span key={p.code}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cutout!} alt="" draggable={false} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, transform: `rotate(${r}deg)` }} />
            <span className={l.tag} style={{ left: `${Math.min(x + w - 14, 80)}%`, top: `${y + 2}%` }}>{p.price}</span>
          </span>
        );
      })}
    </div>
  );
}

export function LooksIntro({ looks }: { looks: ShopLook[] }) {
  const ai = looks.some((x) => x.source === "ai");
  return ai ? (
    <><span className={`${l.aiChip} mono`}>✦ AI picks</span> Outfits put together with AI from pieces in stock, then checked by the team.</>
  ) : (
    <>Outfits the team put together from pieces in stock.</>
  );
}

export function Looks({ looks }: { looks: ShopLook[] }) {
  const { byCode, bag, settings, hasBuilder, sendToBuilder } = useShop();
  const [open, setOpen] = useState<{ look: ShopLook; trigger: HTMLElement } | null>(null);
  const piecesOf = (look: ShopLook) => look.codes.map((c) => byCode.get(c)).filter((p): p is ShopProduct => p?.status === "live" && !!p.cutout);
  const close = () => setOpen(null);

  return (
    <>
      <div className={l.looks}>
        {looks.map((look) => {
          const pieces = piecesOf(look);
          const total = pieces.reduce((t, p) => t + p.price, 0);
          return (
            <article key={look.id}>
              {/* The visible title and total are the button's name, so voice control can say what it sees (WCAG 2.5.3). */}
              <button className={l.open} type="button" onClick={(e) => setOpen({ look, trigger: e.currentTarget })}>
                <Board pieces={pieces} />
                <span className={l.info}>
                  <span className={l.title}>{look.title}</span>
                  <span className={l.sub}>{pieces.length} pieces · {total} QAR{look.source === "ai" ? " · AI pick" : ""}</span>
                </span>
              </button>
            </article>
          );
        })}
      </div>
      <Overlay item={open?.look ?? null} onClose={close} trigger={open?.trigger ?? null} kind="sheet" labelledBy="lookTitle">
        {(look, closeRef) => {
          const pieces = piecesOf(look);
          const total = pieces.reduce((t, p) => t + p.price, 0);
          const allIn = pieces.every((p) => bag.has(p.code));
          const ask = waLink(settings.whatsappNumber, outfitMessage(pieces, look.title));
          return (
            <>
              <div className={l.media}><Board pieces={pieces} big /></div>
              <div className={s.sheetBody}>
                <div className={s.detail}>
                  <p className={`${s.meta} mono`}>{look.source === "ai" ? "AI pick · " : ""}{pieces.length} pieces</p>
                  <h2 className={`${s.title} display`} id="lookTitle">{look.title}</h2>
                  {look.note && <p className={s.note}>{look.note}</p>}
                  <ul className={l.list}>
                    {pieces.map((p) => (
                      <li key={p.code}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.cutout!} alt="" />
                        <span>{p.name}<small>Size {p.size} · {p.code}</small></span>
                        <b>{p.price} QAR</b>
                      </li>
                    ))}
                    <li className={l.total}><span>Look total</span><b>{total} QAR</b></li>
                  </ul>
                  <div className={s.actions}>
                    <button className={`${s.btn} ${s.primary}`} type="button" onClick={(e) => { bag.add(pieces.map((p) => p.code)); close(); bag.open(e.currentTarget); }}>
                      {allIn ? "Look is in your bag. View bag" : `Add look to bag · ${total} QAR`}
                    </button>
                    {hasBuilder && (
                      <button className={`${s.btn} ${s.secondary}`} type="button" onClick={() => {
                        sendToBuilder(pieces);
                        close();
                        setTimeout(() => document.getElementById("outfit")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 300);
                      }}>Remix it in the outfit builder</button>
                    )}
                    {ask && <a className={`${s.btn} ${s.secondary}`} href={ask} target="_blank" rel="noopener">Ask about this look</a>}
                  </div>
                </div>
              </div>
              <button ref={closeRef} className={s.close} type="button" aria-label="Close" onClick={close}>×</button>
            </>
          );
        }}
      </Overlay>
    </>
  );
}
