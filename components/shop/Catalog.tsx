"use client";
// The drop: section chips (Sale and the team's sections, D-060), then a sticky bar with the search (D-064), category chips and
// Hide sold, then the grid. The product sheet and bag live in ShopProvider.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/lib/catalog";
import { categoryChips, filterShop, percentOff, sectionChips, type ShopProduct, type ShopSection } from "@/lib/shop-model";
import { SearchIcon } from "@/components/SearchButton";
import { searchShop } from "@/lib/search";
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
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const chips = useMemo(() => categoryChips(products), [products]);
  const sectionList = useMemo(() => sectionChips(products, sections), [products, sections]);
  const sectionNames = useMemo(() => new Map(sections.map((x) => [x.id, x.name])), [sections]);
  const list = useMemo(
    () => searchShop(filterShop(products, { category, hideSold, section }), query, sectionNames),
    [products, category, hideSold, section, query, sectionNames],
  );

  // A link with ?q= (shared, or from an ad) opens with that search. The page is cached for everyone, so it's read here.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the address once after hydration
    if (q) setQuery(q.slice(0, 80));
  }, []);

  // The search stays in the address so it can be shared; replaced, not pushed, so Back isn't one step per letter.
  function changeQuery(v: string) {
    setQuery(v);
    const u = new URL(window.location.href);
    if (v.trim()) u.searchParams.set("q", v.trim());
    else u.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", u);
  }
  const clearAll = () => { changeQuery(""); setSection(""); setCategory("All"); setHideSold(false); };
  const filtered = !!section || category !== "All" || hideSold;

  return (
    <>
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
      <div className={s.filters}>
        {/* Enter closes the phone keyboard; results update as you type. */}
        <form role="search" className={s.search} onSubmit={(e) => { e.preventDefault(); input.current?.blur(); }}>
          <SearchIcon />
          <input ref={input} id="shop-search" type="search" enterKeyHint="search" autoComplete="off" maxLength={80}
            placeholder="Search jackets, bags, brands…" aria-label="Search the shop" value={query} onChange={(e) => changeQuery(e.target.value)} />
          {query && (
            <button type="button" className={s.searchClear} aria-label="Clear search" onClick={() => { changeQuery(""); input.current?.focus(); }}>×</button>
          )}
        </form>
        <div className={s.chips} role="toolbar" aria-label="Categories">
          {chips.map((c) => (
            <button key={c.category} className={s.chip} type="button" aria-pressed={category === c.category} onClick={() => setCategory(c.category)}>
              {c.category}<span>{c.live}</span>
            </button>
          ))}
        </div>
        <button className={s.chip} type="button" aria-pressed={hideSold} onClick={() => setHideSold((v) => !v)}>Hide sold</button>
      </div>
      <p className={s.resultCount} role="status">
        {query.trim() ? `${list.length} ${list.length === 1 ? "piece matches" : "pieces match"} “${query.trim()}”` : ""}
      </p>
      <div className={s.grid}>
        {list.length ? list.map((p) => <Card key={p.code} p={p} />) : (
          <div className={s.empty}>
            <p>{query.trim() ? `Nothing matches “${query.trim()}”${filtered ? " with these filters" : ""}.` : "No pieces match these filters."}</p>
            <button className={`${s.btn} ${s.secondary}`} type="button" onClick={clearAll}>{query.trim() && !filtered ? "Clear search" : "Clear filters"}</button>
          </div>
        )}
      </div>
    </>
  );
}
