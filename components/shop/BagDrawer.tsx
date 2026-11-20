"use client";
// The bag: a printed thrift receipt that becomes the WhatsApp message. Nothing is sent to our server (D-009).
import Link from "next/link";
import { useId } from "react";
import { lowestFee, orderBlocker, orderMessage, orderTotals } from "@/lib/order";
import { joinDetails } from "@/lib/shop-model";
import { waLink } from "@/lib/wa";
import { Overlay } from "./Overlay";
import { useShop } from "./ShopProvider";
import b from "./bag.module.css";
import s from "./shop.module.css";

const WaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>
);

export function BagButton() {
  const { bag } = useShop();
  const n = bag.items.length;
  return (
    <button className={b.bagBtn} type="button" data-focus-fallback onClick={(e) => bag.open(e.currentTarget)}
      aria-label={`Bag ${n} ${n === 1 ? "piece" : "pieces"}`}>
      Bag <b>{n}</b>
    </button>
  );
}

function Receipt() {
  const { bag, settings } = useShop();
  const { subtotal, fee, total } = orderTotals(bag.items, settings, bag.form);
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className={b.receipt}>
      <div className={b.rcHead}>
        <b>THRIFTESQUE</b>
        <span>{[settings.dropName, date, `${bag.items.length} item${bag.items.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</span>
      </div>
      {bag.items.map((p) => (
        <div className={b.rcLine} key={p.code}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photos[0]} alt="" width={44} height={55} />
          <div>
            <div className={b.rcName}>{p.name}</div>
            <div className={b.rcDetail}>{joinDetails(p.size && `Size ${p.size}`, p.code)}</div>
            <button className={b.rcRm} type="button" onClick={() => bag.remove(p.code)} aria-label={`Remove ${p.name}`}>Remove</button>
          </div>
          <div>{p.price}</div>
        </div>
      ))}
      <div className={b.rcSum}>
        <div><span>Subtotal</span><span>{subtotal} QAR</span></div>
        <div>
          <span>{bag.form.mode === "delivery" ? "Delivery" : "Pickup"}</span>
          <span>{bag.form.mode === "pickup" ? "free" : fee === null ? "choose area" : `${fee} QAR`}</span>
        </div>
        <div className={b.rcTotal}><span>Total</span><span>{total} QAR</span></div>
      </div>
    </div>
  );
}

export function BagDrawer({ open, trigger, onClose }: { open: boolean; trigger: HTMLElement | null; onClose: () => void }) {
  const { bag, settings } = useShop();
  const nameId = useId();
  const areaId = useId();
  const blocker = orderBlocker(bag.items, settings, bag.form);
  const href = blocker ? null : waLink(settings.whatsappNumber, orderMessage(bag.items, settings, bag.form));
  const hint = blocker ?? (href ? "Opens WhatsApp with this receipt as your message." : "Ordering on WhatsApp isn't set up yet.");
  const from = lowestFee(settings);

  return (
    <Overlay item={open ? true : null} onClose={onClose} trigger={trigger} kind="drawer" label="Your bag">
      {(_, closeRef) => (
        <>
          <div className={b.head}>
            <h2 className="display">Your bag</h2>
            <button ref={closeRef} className={s.close} type="button" aria-label="Close bag" onClick={onClose}>×</button>
          </div>
          <div className={b.body}>
            {bag.dropped.length > 0 && (
              <p className={b.notice} role="status">
                {bag.dropped.map((p) => p.name).join(", ")} {bag.dropped.length > 1 ? "were" : "was"} just sold or reserved, so {bag.dropped.length > 1 ? "they're" : "it's"} out of your bag.
              </p>
            )}
            {bag.items.length === 0 ? (
              <div className={b.empty}>
                <h3 className="display">Your bag is empty</h3>
                <p>Add a piece from the drop and it shows up here.</p>
                <Link className={`${s.btn} ${s.primary}`} href="/#shop" onClick={onClose}>Shop the drop</Link>
              </div>
            ) : (
              <>
                <Receipt />
                <div className={b.fields}>
                  <div className={b.field}>
                    <label htmlFor={nameId}>Your name</label>
                    <input id={nameId} autoComplete="name" placeholder="Name for the order" maxLength={60}
                      value={bag.form.name} onChange={(e) => bag.setForm({ name: e.target.value })} />
                  </div>
                  <div className={b.field} role="group" aria-label="Delivery or pickup">
                    <span>Delivery or pickup</span>
                    <div className={b.seg}>
                      <button type="button" aria-pressed={bag.form.mode === "delivery"} onClick={() => bag.setForm({ mode: "delivery" })}>
                        Delivery<small>{from === null ? "Fee by area" : `from ${from} QAR`}</small>
                      </button>
                      <button type="button" aria-pressed={bag.form.mode === "pickup"} onClick={() => bag.setForm({ mode: "pickup" })}>
                        Pickup<small>Free, we share the location</small>
                      </button>
                    </div>
                  </div>
                  {bag.form.mode === "delivery" && (
                    <div className={b.field}>
                      <label htmlFor={areaId}>Area</label>
                      <select id={areaId} value={bag.form.area} onChange={(e) => bag.setForm({ area: e.target.value })}>
                        <option value="">Choose your area</option>
                        {settings.deliveryFees.map((f) => <option key={f.area} value={f.area}>{f.area} ({f.fee} QAR)</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {bag.items.length > 0 && (
            <div className={b.foot}>
              {href ? (
                <a className={`${s.btn} ${b.wa}`} href={href} target="_blank" rel="noopener"><WaIcon />Send order on WhatsApp</a>
              ) : (
                <button className={`${s.btn} ${b.wa}`} type="button" disabled><WaIcon />Send order on WhatsApp</button>
              )}
              <p className={b.hint} aria-live="polite">{hint}</p>
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}
