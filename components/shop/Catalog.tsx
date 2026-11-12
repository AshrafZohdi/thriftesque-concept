"use client";
// The drop: category chips, Hide sold, the grid, and the product sheet. Opening a piece puts /p/<code> in the address bar so it can
// be shared; Back closes the sheet. A direct visit to /p/<code> gets the full product page instead.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Category } from "@/lib/catalog";
import { categoryChips, filterShop, type ShopProduct } from "@/lib/shop-model";
import { useOverlay } from "@/lib/useOverlay";
import { Gallery, ProductDetails } from "./ProductDetails";
import s from "./shop.module.css";

type SheetState = { code: string; trigger: HTMLElement | null } | null;
const SHEET_KEY = "tqSheet";

function Card({ p, onOpen }: { p: ShopProduct; onOpen: (code: string, el: HTMLElement) => void }) {
  const cls = p.status === "sold" ? s.sold : p.status === "reserved" ? s.reserved : "";
  return (
    <article className={`${s.card} ${cls}`}>
      <div className={s.cardMedia}>
        <button className={s.cardPh} type="button" aria-label={`View ${p.name}`} onClick={(e) => onOpen(p.code, e.currentTarget)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photos[0]} alt={p.name} width={720} height={900} loading="lazy" />
        </button>
        {p.status !== "live" && <span className={s.flag}>{p.status === "sold" ? "Sold" : "Reserved"}</span>}
      </div>
      <div className={s.cardInfo}>
        <h3 className={s.cardName}>{p.name}</h3>
        <p className={s.cardMeta}>{p.brand} · {p.era} · {p.condition}</p>
        <p className={s.cardRow}><span className={s.size}>{p.size}</span><span className={s.price}>{p.price} QAR</span></p>
      </div>
    </article>
  );
}

function Sheet({ product, whatsappNumber, trigger, onClose }: {
  product: ShopProduct | null; whatsappNumber: string; trigger: HTMLElement | null; onClose: () => void;
}) {
  const [shown, setShown] = useState<ShopProduct | null>(product);
  const [leaving, setLeaving] = useState(false);
  // Keep the last product on screen while the sheet animates out, then unmount it so it never blocks taps.
  if (product && (product !== shown || leaving)) {
    setShown(product);
    setLeaving(false);
  } else if (!product && shown && !leaving) {
    setLeaving(true);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, 260);
    return () => clearTimeout(t);
  }, [leaving]);
  const closeBtn = useOverlay(!!product, onClose, trigger);
  if (!shown) return null;
  return createPortal(
    <>
      <div className={`${s.scrim} ${leaving ? s.leaving : ""}`} onClick={onClose} />
      <div className={`${s.sheet} ${leaving ? s.leaving : ""}`} role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <Gallery product={shown} className={s.sheetPhotos} />
        <div className={s.sheetBody}>
          <ProductDetails product={shown} whatsappNumber={whatsappNumber} titleId="sheetTitle" heading="h2" />
        </div>
        <button ref={closeBtn} className={s.close} type="button" aria-label="Close" onClick={onClose}>×</button>
      </div>
    </>,
    document.body,
  );
}

export function Catalog({ products, whatsappNumber }: { products: ShopProduct[]; whatsappNumber: string }) {
  const [category, setCategory] = useState<Category | "All">("All");
  const [hideSold, setHideSold] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const byCode = useMemo(() => new Map(products.map((p) => [p.code, p])), [products]);
  const chips = useMemo(() => categoryChips(products), [products]);
  const list = useMemo(() => filterShop(products, { category, hideSold }), [products, category, hideSold]);

  const open = useCallback((code: string, trigger: HTMLElement) => {
    window.history.pushState({ [SHEET_KEY]: code }, "", `/p/${code}`);
    setSheet({ code, trigger });
  }, []);
  const close = useCallback(() => {
    if (window.history.state?.[SHEET_KEY]) window.history.back();
    else setSheet(null);
  }, []);
  useEffect(() => {
    const onPop = () => {
      const code = window.history.state?.[SHEET_KEY];
      setSheet((cur) => (code && byCode.has(code) ? { code, trigger: cur?.trigger ?? null } : null));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [byCode]);

  return (
    <>
      <div className={s.filters}>
        <div className={s.chips} role="toolbar" aria-label="Categories">
          {chips.map((c) => (
            <button key={c.category} className={s.chip} type="button" aria-pressed={category === c.category} onClick={() => setCategory(c.category)}>
              {c.category}<span>{c.live}</span>
            </button>
          ))}
        </div>
        <button className={s.chip} type="button" aria-pressed={hideSold} onClick={() => setHideSold((v) => !v)}>Hide sold</button>
      </div>
      <div className={s.grid}>
        {list.length ? list.map((p) => <Card key={p.code} p={p} onOpen={open} />) : (
          <div className={s.empty}>
            <p>No pieces match these filters.</p>
            <button className={`${s.btn} ${s.secondary}`} type="button" onClick={() => { setCategory("All"); setHideSold(false); }}>Clear filters</button>
          </div>
        )}
      </div>
      <Sheet product={sheet ? byCode.get(sheet.code) ?? null : null} whatsappNumber={whatsappNumber} trigger={sheet?.trigger ?? null} onClose={close} />
    </>
  );
}
