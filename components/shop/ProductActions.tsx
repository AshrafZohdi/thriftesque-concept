"use client";
// Buttons under a product: add to bag, build an outfit with it (only where the builder is on the page), ask on WhatsApp.
import { slotOf } from "@/lib/outfit";
import type { ShopProduct } from "@/lib/shop-model";
import { sentItems, tally } from "@/lib/tally";
import { askAboutPiece, waLink } from "@/lib/wa";
import { useShop } from "./ShopProvider";
import s from "./shop.module.css";

export function ProductActions({ product: p, inSheet = false, onLeave }: { product: ShopProduct; inSheet?: boolean; onLeave?: () => void }) {
  const { bag, settings, hasBuilder, sendToBuilder } = useShop();
  const ask = waLink(settings.whatsappNumber, askAboutPiece(p));
  const inBag = bag.has(p.code);
  const canBuild = hasBuilder && inSheet && p.status === "live" && !!p.cutout && !!slotOf(p.category);

  const toBag = (el: HTMLElement) => {
    bag.add([p.code]);
    onLeave?.();
    bag.open(el);
  };
  const toBuilder = () => {
    sendToBuilder([p]);
    onLeave?.();
    setTimeout(() => document.getElementById("outfit")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 300);
  };

  return (
    <>
      {p.status === "live" ? (
        <button className={`${s.btn} ${s.primary}`} type="button" onClick={(e) => toBag(e.currentTarget)}>
          {inBag ? "In your bag. View bag" : "Add to bag"}
        </button>
      ) : (
        <button className={`${s.btn} ${s.primary}`} type="button" disabled>{p.status === "sold" ? "Sold" : "Reserved"}</button>
      )}
      {canBuild && <button className={`${s.btn} ${s.secondary}`} type="button" onClick={toBuilder}>Build an outfit with this</button>}
      {ask && <a className={`${s.btn} ${s.secondary}`} href={ask} target="_blank" rel="noopener" onClick={() => tally("ask_sent", { kind: "piece", items: sentItems([p]) })}>Ask about this piece</a>}
    </>
  );
}
