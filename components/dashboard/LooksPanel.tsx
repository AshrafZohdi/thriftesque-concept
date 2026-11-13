"use client";
// Looks (D-028): the AI suggests outfits from live stock with cut-outs, saved as drafts. Only what the team publishes shows
// in the shop, and only while every piece in it is live with a cut-out.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteLook, setLookStatus, suggestLooks } from "@/app/dashboard/actions";
import s from "@/components/shop/shop.module.css";
import { browserDb } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/supabase/public";
import type { Database } from "@/lib/database.types";
import type { TeamProduct } from "@/lib/dashboard";
import d from "./dashboard.module.css";

type LookRow = Pick<Database["public"]["Tables"]["looks"]["Row"], "id" | "title" | "note" | "product_codes" | "source" | "status">;

function LookCard({ look, pieces, onChange }: { look: LookRow; pieces: Map<string, TeamProduct>; onChange: (msg: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const missing = look.product_codes.filter((c) => { const p = pieces.get(c); return !p || p.status !== "live" || !p.cutout; });
  const published = look.status === "published";

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) {
    setBusy(true);
    const r = await action();
    setBusy(false);
    onChange(r.ok ? done : r.error);
  }

  return (
    <article className={d.look} aria-label={look.title}>
      <div className={d.lookPieces}>
        {look.product_codes.map((c) => {
          const p = pieces.get(c);
          // eslint-disable-next-line @next/next/no-img-element
          return p?.cutout ? <img key={c} src={photoUrl(p.cutout)} alt={p.name} width={64} height={80} /> : <span key={c} className={d.lookGap}>{c}</span>;
        })}
      </div>
      <div className={d.lookText}>
        <h3>{look.title}</h3>
        {look.note && <p className={d.muted}>{look.note}</p>}
        <p className={d.lookMeta}>
          <span className={d.tag}>{look.source === "ai" ? "AI" : "Team"}</span>
          <span>{published ? "Published" : "Draft"}</span>
          <span>{look.product_codes.join(" · ")}</span>
        </p>
        {missing.length > 0 && (
          <p className={d.fieldErr}>Hidden in the shop: {missing.join(", ")} {missing.length === 1 ? "isn't" : "aren't"} live with a cut-out.</p>
        )}
      </div>
      <div className={d.acts}>
        <button className={d.btnSm} type="button" disabled={busy} aria-label={`${published ? "Unpublish" : "Publish"} ${look.title}`}
          onClick={() => run(() => setLookStatus(look.id, published ? "draft" : "published"), published ? `${look.title} is a draft again` : `${look.title} published`)}>
          {published ? "Unpublish" : "Publish"}
        </button>
        <button className={`${d.btnSm} ${d.danger}`} type="button" disabled={busy} data-confirm={confirm}
          aria-label={confirm ? `Confirm delete ${look.title}` : `Delete ${look.title}`}
          onClick={() => {
            if (confirm) return run(() => deleteLook(look.id), `${look.title} deleted`);
            setConfirm(true);
            timer.current = setTimeout(() => setConfirm(false), 3000);
          }}>
          {confirm ? "Tap again to delete" : "Delete"}
        </button>
      </div>
    </article>
  );
}

export function LooksPanel({ say, products }: { say: (msg: string) => void; products: TeamProduct[] }) {
  const [looks, setLooks] = useState<LookRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const pieces = useMemo(() => new Map(products.map((p) => [p.code, p])), [products]);

  const fetchLooks = useCallback(
    () => browserDb().from("looks").select("id,title,note,product_codes,source,status").order("created_at", { ascending: false }),
    [],
  );
  const load = useCallback(async () => {
    const { data, error } = await fetchLooks();
    if (error) setMsg("Couldn't load the looks. Refresh the page.");
    else setLooks(data);
  }, [fetchLooks]);

  useEffect(() => {
    let alive = true;
    fetchLooks().then(({ data, error }) => {
      if (!alive) return;
      if (error) setMsg("Couldn't load the looks. Refresh the page.");
      else setLooks(data);
    });
    return () => {
      alive = false;
    };
  }, [fetchLooks]);
  async function suggest() {
    setBusy(true);
    setMsg("Asking the AI for outfits from live stock…");
    const r = await suggestLooks();
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    setMsg(r.added ? `${r.added} new ${r.added === 1 ? "look" : "looks"} added as drafts. Publish the ones you like.` : "No new looks this time. Try again, or add more live pieces with cut-outs.");
    await load();
  }

  async function changed(text: string) {
    say(text);
    await load();
  }

  const drafts = looks?.filter((l) => l.status === "draft") ?? [];
  const published = looks?.filter((l) => l.status === "published") ?? [];

  return (
    <section className={d.settings} aria-labelledby="looksTitle">
      <div className={d.title}>
        <div>
          <h2 className="display" id="looksTitle">Looks</h2>
          <p className={d.muted}>The AI suggests outfits from live pieces with cut-outs. Nothing shows in the shop until you publish it.</p>
        </div>
        <button className={`${s.btn} ${s.primary}`} type="button" disabled={busy} onClick={suggest}>{busy ? "Suggesting…" : "Suggest looks"}</button>
      </div>
      <p className={d.muted} role="status" aria-live="polite">{msg}</p>
      {looks === null ? <p className={d.muted}>Loading looks…</p> : (
        <>
          <h3 className={d.fieldLegend}>Drafts ({drafts.length})</h3>
          {drafts.length ? drafts.map((l) => <LookCard key={l.id} look={l} pieces={pieces} onChange={changed} />) : <p className={d.empty}>No drafts. Press Suggest looks to get some.</p>}
          <h3 className={d.fieldLegend}>Published ({published.length})</h3>
          {published.length ? published.map((l) => <LookCard key={l.id} look={l} pieces={pieces} onChange={changed} />) : <p className={d.empty}>Nothing published yet.</p>}
        </>
      )}
    </section>
  );
}
