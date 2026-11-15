"use client";
// The drop: section chips (Sale and the team's sections, D-060), category chips, Hide sold and the grid. The product sheet and bag live in ShopProvider.
import { useMemo, useState } from "react";
import type { Category } from "@/lib/catalog";
import { categoryChips, filterShop, percentOff, sectionChips, type ShopProduct, type ShopSection } from "@/lib/shop-model";
import { Price } from "./ProductDetails";
import { useShop } from "./ShopProvider";
import s from "./shop.module.css";

const Plus = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" fill="none" /></svg>;

function Card({ p }: { p: ShopProduct }) {
  const { openProduct, bag, toast } = useShop();
  const inBag = bag.has(p.code);
  const cls = p.status === "sold" ? s.sold : p.status === "reserved" ? s.reserved : "";
  return (
    <article className={`${s.card} ${cls}`}>
      <div className={s.cardMedia}>
        <button className={s.cardPh} type="button" aria-label={`View ${p.name}`} onClick={(e) => openProduct(p.code, e.currentTarget)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photos[0]} alt={p.name} width={720} height={900} loading="lazy" />
        </button>
        {p.status !== "live" && <span className={s.flag}>{p.status === "sold" ? "Sold" : "Reserved"}</span>}
        {p.status === "live" && p.wasPrice !== null && <span className={`${s.flag} ${s.saleFlag}`}>{percentOff(p)}% off</span>}
        {p.status === "live" && (
          <button className={`${s.add} ${inBag ? s.in : ""}`} type="button"
            aria-label={inBag ? `${p.name} is in your bag. Open bag` : `Add ${p.name} to bag`}
            onClick={(e) => (inBag ? bag.open(e.currentTarget) : (bag.add([p.code]), toast(`Added ${p.name}`)))}>
            {inBag ? <Check /> : <Plus />}
          </button>
        )}
      </div>
      <div className={s.cardInfo}>
        <h3 className={s.cardName}>{p.name}</h3>
        <p className={s.cardMeta}>{p.brand} · {p.era} · {p.condition}</p>
        <p className={s.cardRow}><span className={s.size}>{p.size}</span><Price p={p} /></p>
      </div>
    </article>
  );
}

export function Catalog({ sections }: { sections: ShopSection[] }) {
  const { products } = useShop();
  const [section, setSection] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [hideSold, setHideSold] = useState(false);
  const chips = useMemo(() => categoryChips(products), [products]);
  const sectionList = useMemo(() => sectionChips(products, sections), [products, sections]);
  const list = useMemo(() => filterShop(products, { category, hideSold, section }), [products, category, hideSold, section]);

  return (
    <>
      <div className={s.filters}>
        {sectionList.length > 0 && (
          <div className={`${s.chips} ${s.sectionChips}`} role="toolbar" aria-label="Sections">
            {/* Tapping the chosen section again shows everything. */}
            {sectionList.map((c) => (
              <button key={c.id} className={s.chip} type="button" aria-pressed={section === c.id} onClick={() => setSection((v) => (v === c.id ? "" : c.id))}>
                {c.name}<span>{c.live}</span>
              </button>
            ))}
          </div>
        )}
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
        {list.length ? list.map((p) => <Card key={p.code} p={p} />) : (
          <div className={s.empty}>
            <p>No pieces match these filters.</p>
            <button className={`${s.btn} ${s.secondary}`} type="button" onClick={() => { setSection(""); setCategory("All"); setHideSold(false); }}>Clear filters</button>
          </div>
        )}
      </div>
    </>
  );
}
