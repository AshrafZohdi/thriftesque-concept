"use client";
// Team dashboard: stats, product table (search, status tabs, inline status, two-tap delete), looks and shop settings.
// Reads with the signed-in session in the browser; writes go through server actions that check the team first.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { deleteProduct, saveSettings, setStatus } from "@/app/dashboard/actions";
import { ChromeHeart } from "@/components/Chrome";
import s from "@/components/shop/shop.module.css";
import { STATUSES, codeNumber, type Status } from "@/lib/catalog";
import { dashboardStats, searchProducts, type SettingsInput, type TeamProduct } from "@/lib/dashboard";
import { DETAIL_COLUMNS, DETAIL_LABELS, detailsFromRow, missingDetails, type ShopDetails } from "@/lib/shop-facts";
import { browserDb } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/supabase/public";
import d from "./dashboard.module.css";
import { LooksPanel } from "./LooksPanel";
import { ProductEditor, emptyProduct, loadForEdit, type EditTarget } from "./ProductEditor";

type Load = { state: "checking" } | { state: "not-team"; email: string } | { state: "error"; message: string } | {
  state: "ready"; email: string; products: TeamProduct[]; settings: SettingsInput;
};

const LABEL: Record<Status, string> = { live: "Live", reserved: "Reserved", sold: "Sold", hidden: "Hidden" };

async function loadAll(): Promise<Load | "signed-out"> {
  const db = browserDb();
  const { data } = await db.auth.getUser();
  if (!data.user) return "signed-out";
  const email = data.user.email ?? "";
  const team = await db.rpc("is_team");
  if (team.data !== true) return { state: "not-team", email };
  const [products, settings] = await Promise.all([
    db.from("products").select("code,name,brand,era,category,size,price_qar,status,photos,cutout,created_at,sold_at"),
    db.from("settings").select(`whatsapp_number,drop_name,delivery_fees,${DETAIL_COLUMNS}`).eq("id", 1).single(),
  ]);
  if (products.error || settings.error) return { state: "error", message: (products.error ?? settings.error)!.message };
  const fees = Array.isArray(settings.data.delivery_fees) ? settings.data.delivery_fees : [];
  return {
    state: "ready",
    email,
    products: [...products.data].sort((a, b) => codeNumber(b.code) - codeNumber(a.code)),
    settings: {
      whatsappNumber: settings.data.whatsapp_number,
      dropName: settings.data.drop_name,
      deliveryFees: fees.map((f) => ({ area: String((f as { area?: string })?.area ?? ""), fee: Number((f as { fee_qar?: number })?.fee_qar ?? 0) })),
      details: detailsFromRow(settings.data),
    },
  };
}

function Row({ p, onStatus, onDelete, onEdit }: {
  p: TeamProduct; onStatus: (code: string, s: Status) => void; onDelete: (code: string) => void; onEdit: (code: string, el: HTMLElement) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={d.row}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.photos[0] ? photoUrl(p.photos[0]) : ""} alt="" width={56} height={70} />
      <div className={d.nm}><b>{p.name}</b><span>{p.code} · {p.brand} · {p.era}</span></div>
      <span className={`${d.muted} ${d.hideSm}`}>{p.category}</span>
      <span className={d.hideSm}>{p.size}</span>
      <span className={d.price}>{p.price_qar} QAR</span>
      <select className={d.status} data-s={p.status} value={p.status} aria-label={`Status of ${p.name}`}
        onChange={(e) => onStatus(p.code, e.target.value as Status)}>
        {STATUSES.map((st) => <option key={st} value={st}>{LABEL[st]}</option>)}
      </select>
      <div className={d.acts}>
        <button className={d.btnSm} type="button" aria-label={`Edit ${p.name}`} onClick={(e) => onEdit(p.code, e.currentTarget)}>Edit</button>
        {/* Two taps instead of a confirm() dialog (CLAUDE.md). The first tap arms it for 3 seconds. */}
        <button className={`${d.btnSm} ${d.danger}`} type="button" data-confirm={confirm}
          aria-label={confirm ? `Confirm delete ${p.name}` : `Delete ${p.name}`}
          onClick={() => {
            if (confirm) return onDelete(p.code);
            setConfirm(true);
            timer.current = setTimeout(() => setConfirm(false), 3000);
          }}>
          {confirm ? "Tap again to delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// The editable shop details, in order: field, example text (a placeholder, never saved), and textarea rows (0 = one line).
const DETAIL_FIELDS: [keyof ShopDetails, string, number][] = [
  ["operatorName", "For example: Thriftesque (Jane Doe), Doha, Qatar", 0],
  ["contactEmail", "For example: name@example.com", 0],
  ["deliveryText", "For example: Across Qatar. Doha orders arrive within 24 hours. The fee is added to your order.", 3],
  ["paymentText", "For example: Cash on delivery or bank transfer. We share details when we confirm.", 3],
  ["returnsText", "For example: All sales are final. Or: exchanges within 3 days if the piece is unworn.", 3],
  ["reservedHoldText", "For example: 24 hours", 0],
  ["orderRetentionText", "For example: 6 months after delivery", 0],
];

function SettingsPanel({ initial, onSaved }: { initial: SettingsInput; onSaved: (v: SettingsInput) => void }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const waId = useId();
  const dropId = useId();
  const detailsId = useId();
  const missing = missingDetails(v.details);
  const setFee = (i: number, patch: Partial<{ area: string; fee: number }>) =>
    setV({ ...v, deliveryFees: v.deliveryFees.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await saveSettings(v);
    setBusy(false);
    setMsg(r.ok ? "Saved. The shop shows the new settings now." : r.error);
    if (r.ok) onSaved(v);
  }

  return (
    <form className={d.settings} onSubmit={save} aria-labelledby="settingsTitle" noValidate>
      <h2 className="display" id="settingsTitle">Shop settings</h2>
      <div className={d.field}>
        <label htmlFor={waId}>WhatsApp number for orders</label>
        <input id={waId} inputMode="tel" placeholder="97455551234" value={v.whatsappNumber} onChange={(e) => setV({ ...v, whatsappNumber: e.target.value })} />
        <p className={d.muted}>Country code first, digits only. Orders open WhatsApp to this number.</p>
      </div>
      <div className={d.field}>
        <label htmlFor={dropId}>Drop name</label>
        <input id={dropId} maxLength={40} placeholder="Drop 08" value={v.dropName} onChange={(e) => setV({ ...v, dropName: e.target.value })} />
      </div>
      <fieldset className={d.areas} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={d.fieldLegend}>Delivery areas and fees (QAR)</legend>
        {v.deliveryFees.map((f, i) => (
          <div className={d.area} key={i}>
            <input aria-label={`Area ${i + 1}`} value={f.area} maxLength={40} onChange={(e) => setFee(i, { area: e.target.value })} />
            <input aria-label={`Fee for ${f.area || `area ${i + 1}`}`} type="number" inputMode="numeric" min={0} max={1000} step={1}
              value={Number.isFinite(f.fee) ? f.fee : ""} onChange={(e) => setFee(i, { fee: e.target.value === "" ? NaN : Number(e.target.value) })} />
            <button className={d.btnSm} type="button" aria-label={`Remove ${f.area || `area ${i + 1}`}`}
              onClick={() => setV({ ...v, deliveryFees: v.deliveryFees.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <button className={d.btnSm} type="button" onClick={() => setV({ ...v, deliveryFees: [...v.deliveryFees, { area: "", fee: 15 }] })}>+ Add area</button>
      </fieldset>
      <fieldset className={d.areas} style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={`${detailsId}-hint`}>
        <legend className={d.fieldLegend}>Terms and privacy details</legend>
        <p className={d.muted} id={`${detailsId}-hint`}>
          Shown on the Terms and Privacy pages (and delivery and payment on the shop). Until a box is filled in, those pages say
          &quot;To be confirmed&quot;, and the shop can&apos;t leave preview mode.{" "}
          {missing.length ? `Still to fill in: ${missing.join(", ")}.` : "All filled in."}
        </p>
        {DETAIL_FIELDS.map(([key, hint, rows]) => (
          <div className={d.field} key={key}>
            <label htmlFor={`${detailsId}-${key}`}>{DETAIL_LABELS[key]}</label>
            {rows ? (
              <textarea id={`${detailsId}-${key}`} rows={rows} value={v.details[key]} placeholder={hint}
                onChange={(e) => setV({ ...v, details: { ...v.details, [key]: e.target.value } })} />
            ) : (
              <input id={`${detailsId}-${key}`} value={v.details[key]} placeholder={hint}
                type={key === "contactEmail" ? "email" : "text"} inputMode={key === "contactEmail" ? "email" : undefined}
                onChange={(e) => setV({ ...v, details: { ...v.details, [key]: e.target.value } })} />
            )}
          </div>
        ))}
      </fieldset>
      <div className={d.saveRow}>
        <button className={`${s.btn} ${s.primary}`} type="submit" disabled={busy}>{busy ? "Saving" : "Save settings"}</button>
        <p className={d.muted} role="status">{msg}</p>
      </div>
    </form>
  );
}

export function Dashboard() {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ state: "checking" });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Status | "all">("all");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<{ target: EditTarget; trigger: HTMLElement | null } | null>(null);
  const nonce = useRef(0);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((text: string) => {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 3000);
  }, []);

  const refresh = useCallback(async () => {
    const r = await loadAll();
    if (r === "signed-out") router.replace("/login");
    else setLoad(r);
  }, [router]);

  useEffect(() => {
    let alive = true;
    loadAll().then((r) => {
      if (!alive) return;
      if (r === "signed-out") router.replace("/login");
      else setLoad(r);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  const products = useMemo(() => (load.state === "ready" ? load.products : []), [load]);
  const stats = useMemo(() => dashboardStats(products), [products]);
  const list = useMemo(() => searchProducts(products, query, tab), [products, query, tab]);

  async function changeStatus(code: string, status: Status) {
    const name = products.find((p) => p.code === code)?.name ?? code;
    const r = await setStatus(code, status);
    if (!r.ok) return say(r.error);
    say(status === "sold" ? `${name} marked sold` : status === "live" ? `${name} is live in the shop` : status === "reserved" ? `${name} reserved` : `${name} hidden from the shop`);
    await refresh();
  }

  async function remove(code: string) {
    const name = products.find((p) => p.code === code)?.name ?? code;
    const r = await deleteProduct(code);
    if (!r.ok) return say(r.error);
    say(`${name} deleted`);
    await refresh();
  }

  // This device only: a team member signed in on a laptop and a phone stays signed in on the other one.
  // Leaves for the sign-in page even if the request fails, so the page can't get stuck.
  async function openEditor(code: string | null, trigger: HTMLElement | null) {
    try {
      const values = code ? await loadForEdit(code) : emptyProduct();
      setEdit({ target: { code, values, nonce: ++nonce.current }, trigger });
    } catch (e) {
      say(e instanceof Error ? e.message : "Couldn't open that product.");
    }
  }

  async function onSaved(code: string, created: boolean) {
    setEdit(null);
    say(created ? `${code} added` : `${code} saved`);
    await refresh();
  }

  async function signOut() {
    try {
      await browserDb().auth.signOut({ scope: "local" });
    } finally {
      router.replace("/login");
    }
  }

  if (load.state === "checking") return <main className={d.loginWrap}><p className="mono" role="status">Checking your sign-in…</p></main>;
  if (load.state === "not-team" || load.state === "error") {
    return (
      <main className={d.loginWrap}>
        <div className={d.card}>
          <h1 className="display">{load.state === "not-team" ? "Not on the team" : "Something went wrong"}</h1>
          <p className={d.muted}>{load.state === "not-team" ? `${load.email} is signed in, but this account isn't on the Thriftesque team. Ask Nuvai to add it.` : load.message}</p>
          <button className={`${s.btn} ${s.secondary}`} type="button" onClick={signOut}>Sign out</button>
        </div>
      </main>
    );
  }

  const tabs: [Status | "all", string, number][] = [
    ["all", "All", products.length], ["live", "Live", stats.live], ["reserved", "Reserved", stats.reserved],
    ["sold", "Sold", stats.sold], ["hidden", "Hidden", stats.hidden],
  ];

  return (
    <>
      <div data-page>
      <header className={d.bar}>
        <div className={`wrap ${d.barIn}`}>
          <span className={d.brand}><ChromeHeart />Thriftesque</span>
          <span className={d.tag}>Team</span>
          <span className={d.who}>Signed in as {load.email}</span>
          <Link href="/" style={{ marginInlineStart: "auto" }}>View shop</Link>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className={`wrap ${d.main}`}>
        <div className={d.title}>
          <div>
            <h1 className="display">Products</h1>
            <p>Add pieces, change a status, search the stock and keep the shop settings up to date.</p>
          </div>
          <button className={`${s.btn} ${s.primary}`} type="button" onClick={(e) => openEditor(null, e.currentTarget)}>+ Add product</button>
        </div>
        <section className={d.stats} aria-label="Stats">
          <div className={d.stat}><span>Live in shop</span><b>{stats.live}</b></div>
          <div className={d.stat}><span>Sold</span><b>{stats.sold}</b></div>
          <div className={d.stat}><span>Sales</span><b>{stats.salesTotal.toLocaleString("en")} <small>QAR</small></b></div>
          <div className={d.stat}><span>Live stock value</span><b>{stats.liveValue.toLocaleString("en")} <small>QAR</small></b></div>
          <div className={d.stat}><span>Avg days to sell</span><b>{stats.avgDaysToSell ?? "None yet"}</b></div>
        </section>
        <div className={d.tools}>
          <div className={d.search}>
            <input type="search" placeholder="Search by name, brand or code" aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className={d.tabs} role="toolbar" aria-label="Status">
            {tabs.map(([k, label, n]) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{label}<span>{n}</span></button>
            ))}
          </div>
        </div>
        <section className={d.table} aria-label="Products">
          {list.length ? list.map((p) => <Row key={p.code} p={p} onStatus={changeStatus} onDelete={remove} onEdit={openEditor} />) : (
            <p className={d.empty}>No products match. Try another search or tab.</p>
          )}
        </section>
        <LooksPanel say={say} products={products} />
        <SettingsPanel initial={load.settings} onSaved={() => refresh()} />
      </main>
      </div>
      <ProductEditor target={edit?.target ?? null} trigger={edit?.trigger ?? null} onClose={() => setEdit(null)} onSaved={onSaved} />
      <p className={d.toast} role="status" aria-live="polite">{note}</p>
    </>
  );
}
