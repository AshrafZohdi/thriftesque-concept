"use client";
// Outfit builder (D-027): arrows or a sideways swipe change one piece, lock keeps a piece, Shuffle changes the rest.
import { useMemo, useRef, useState } from "react";
import { outfitMessage } from "@/lib/order";
import {
  activeSlots, availableModes, initialOutfit, load, outfitPieces, pools, shuffle, step,
  type OutfitMode, type OutfitState, type SlotKey,
} from "@/lib/outfit";
import { joinDetails, type ShopProduct } from "@/lib/shop-model";
import { sentItems, tally } from "@/lib/tally";
import { waLink } from "@/lib/wa";
import { useShop } from "./ShopProvider";
import o from "./builder.module.css";
import s from "./shop.module.css";

type Anim = { slots: Partial<Record<SlotKey, "inL" | "inR" | "inPop">>; n: number };

const LockIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d={open ? "M8 11V8a4 4 0 0 1 7.6-1.8" : "M8 11V8a4 4 0 0 1 8 0v3"} />
  </svg>
);
const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);

export function OutfitBuilder() {
  const { products, byCode, settings, bag, openProduct, builderRequest } = useShop();
  const pl = useMemo(() => pools(products), [products]);
  const modes = useMemo(() => availableModes(pl), [pl]);
  const [state, setState] = useState<OutfitState | null>(() => initialOutfit(pl));
  const [anim, setAnim] = useState<Anim>({ slots: {}, n: 0 });
  const [live, setLive] = useState("");
  const [seenRequest, setSeenRequest] = useState(0);

  const apply = (next: OutfitState, slots: Anim["slots"]) => {
    setState(next);
    setAnim((a) => ({ slots, n: a.n + 1 }));
    setLive(`Outfit: ${outfitPieces(next, pl, byCode).map((p) => p.name).join(", ")}`);
  };

  // A look's "Remix" or a sheet's "Build an outfit with this" arrives as a request; apply each one once.
  if (state && builderRequest && builderRequest.nonce !== seenRequest) {
    setSeenRequest(builderRequest.nonce);
    const r = load(state, pl, builderRequest.pieces, false);
    apply(r.state, Object.fromEntries(r.moved.map((k) => [k, "inPop"])));
  }

  // Sideways swipe on a piece. Vertical movement still scrolls the page (touch-action: pan-y).
  const swipe = useRef<{ x: number; y: number; key: SlotKey } | null>(null);
  const swiped = useRef(false);

  if (!state) return null;
  const slots = activeSlots(state.mode, pl);
  const pieces = outfitPieces(state, pl, byCode);
  const total = pieces.reduce((t, p) => t + p.price, 0);
  const allIn = pieces.length > 0 && pieces.every((p) => bag.has(p.code));
  const ask = waLink(settings.whatsappNumber, outfitMessage(pieces));

  const move = (key: SlotKey, dir: 1 | -1) => apply(step(state, pl, key, dir), { [key]: dir > 0 ? "inR" : "inL" });
  const setMode = (mode: OutfitMode) => {
    if (mode !== state.mode) apply({ ...state, mode }, Object.fromEntries(activeSlots(mode, pl).map((x) => [x.key, "inPop"])));
  };
  const doShuffle = () => {
    const r = shuffle(state, pl);
    apply(r.state, Object.fromEntries(r.moved.map((k) => [k, "inPop"])));
  };
  const addOutfit = (el: HTMLElement) => {
    bag.add(pieces.map((p) => p.code));
    bag.open(el);
  };
  const clothes = slots.filter((x) => x.key !== "bag");
  const bagSlot = slots.find((x) => x.key === "bag");
  const bagPiece = bagSlot ? byCode.get(state.pick.bag ?? "") : undefined;

  // One piece on the stage: tap for its details, swipe sideways to change it, lock to keep it when shuffling.
  const piece = (slot: (typeof slots)[number], p: ShopProduct) => {
    const name = slot.label.toLowerCase();
    const locked = !!state.lock[slot.key];
    return (
      <div
        className={o.item}
        onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY, key: slot.key }; swiped.current = false; }}
        onPointerUp={(e) => {
          const st = swipe.current;
          swipe.current = null;
          if (!st) return;
          const dx = e.clientX - st.x, dy = e.clientY - st.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            swiped.current = true;
            setTimeout(() => (swiped.current = false), 80);
            move(st.key, dx < 0 ? 1 : -1);
          }
        }}
      >
        <button
          className={o.pick}
          type="button"
          aria-label={`${slot.label}: ${[p.name, p.size && `size ${p.size}`, `${p.price} QAR`].filter(Boolean).join(", ")}. View details`}
          onClick={(e) => { if (!swiped.current) openProduct(p.code, e.currentTarget); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`${p.code}-${anim.n}`} className={anim.slots[slot.key] ? o[anim.slots[slot.key]!] : undefined} src={p.cutout!} alt="" draggable={false} />
        </button>
        <button
          className={o.lock}
          type="button"
          aria-pressed={locked}
          aria-label={`Keep this ${name} when shuffling`}
          onClick={() => setState({ ...state, lock: { ...state.lock, [slot.key]: !locked } })}
        >
          <LockIcon open={!locked} />
        </button>
      </div>
    );
  };

  return (
    <div className={o.ob}>
      <div className={`${o.stage} ${bagPiece?.cutout ? o.hasBag : ""}`}>
        {modes.length > 1 && (
          <div className={o.modes} role="group" aria-label="Outfit type">
            <button type="button" aria-pressed={state.mode === "separates"} onClick={() => setMode("separates")}>Top + bottom</button>
            <button type="button" aria-pressed={state.mode === "dress"} onClick={() => setMode("dress")}>Dress</button>
          </div>
        )}
        <div className={o.clothes}>
          {clothes.map((slot) => {
            const p = byCode.get(state.pick[slot.key] ?? "");
            if (!p?.cutout) return null;
            const name = slot.label.toLowerCase();
            return (
              <div key={slot.key} className={`${o.row} ${o[slot.key]}`}>
                <button className={o.nav} type="button" aria-label={`Previous ${name}`} onClick={() => move(slot.key, -1)}>‹</button>
                {piece(slot, p)}
                <button className={o.nav} type="button" aria-label={`Next ${name}`} onClick={() => move(slot.key, 1)}>›</button>
              </div>
            );
          })}
        </div>
        {/* The bag stands to the right of the clothes (D-063), with its arrows under it. */}
        {bagSlot && bagPiece?.cutout && (
          <div className={`${o.side} ${o.bag}`}>
            {piece(bagSlot, bagPiece)}
            <div className={o.sideNav}>
              <button className={o.nav} type="button" aria-label="Previous bag" onClick={() => move("bag", -1)}>‹</button>
              <button className={o.nav} type="button" aria-label="Next bag" onClick={() => move("bag", 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      <ul className={o.list}>
        {slots.map((slot) => {
          const p = byCode.get(state.pick[slot.key] ?? "");
          return p ? (
            <li key={slot.key}>
              <span className={o.k}>{slot.label}</span>
              <span className={o.n}>{p.name}<small>{joinDetails(p.size && `Size ${p.size}`, p.code)}</small></span>
              <b>{p.price} QAR</b>
            </li>
          ) : null;
        })}
        <li className={o.total}><span>Outfit total</span><b>{total} QAR</b></li>
      </ul>

      <div className={o.actions}>
        <button className={`${s.btn} ${s.secondary}`} type="button" onClick={doShuffle} style={{ background: "var(--color-surface)" }}>
          <ShuffleIcon /><span className={o.shuffleText}>Shuffle</span>
        </button>
        <button className={`${s.btn} ${s.primary}`} type="button" onClick={(e) => addOutfit(e.currentTarget)}>
          {allIn ? "Outfit is in your bag" : `Add outfit · ${total} QAR`}
        </button>
      </div>
      {ask && <a className={o.ask} href={ask} target="_blank" rel="noopener" onClick={() => tally("ask_sent", { kind: "outfit", items: sentItems(pieces) })}>Ask about this outfit on WhatsApp</a>}
      <p className="sr-only-text" aria-live="polite">{live}</p>
    </div>
  );
}
