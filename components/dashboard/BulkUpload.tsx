"use client";
// Bulk add (D-051): pick many photos, one piece per photo. Each is resized and uploaded like in the editor, optionally described
// by the AI and cut out, then saved as a hidden draft. Photos are handled one at a time so phones don't run out of memory and
// the AI's free per-minute limit holds. The team finishes each draft (price, size, condition, measurements) in the editor.
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createDraft } from "@/app/dashboard/actions";
import { Overlay } from "@/components/shop/Overlay";
import s from "@/components/shop/shop.module.css";
import type { AutofillFields } from "@/lib/ai";
import { toCutout, toProductPhoto } from "@/lib/image";
import { PHOTO } from "@/lib/photo-spec";
import { missingForShop, type TeamProduct } from "@/lib/dashboard";
import { browserDb } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/supabase/public";
import d from "./dashboard.module.css";
import { upload } from "./ProductEditor";

export const MAX_BULK = 30;
// Space between AI calls, so a batch stays under the free tier's requests-per-minute limit.
const AI_GAP_MS = 4000;

type Item = { file: File; state: "waiting" | "working" | "done" | "failed"; note: string; code?: string };

function Bulk({ onClose, onDone, onEdit, products, closeRef, cancelRef }: {
  onClose: () => void; onDone: (added: number) => void; onEdit: (code: string, trigger: HTMLElement) => void;
  products: TeamProduct[]; closeRef: RefObject<HTMLButtonElement | null>; cancelRef: RefObject<(() => void) | null>;
}) {
  const ids = { ai: useId(), cut: useId() };
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [useAi, setUseAi] = useState(true);
  const [makeCutouts, setMakeCutouts] = useState(false);
  const [phase, setPhase] = useState<"pick" | "running" | "done">("pick");
  const [summary, setSummary] = useState("");
  const stop = useRef(false);

  const set = (i: number, patch: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function pick(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, MAX_BULK);
    setItems(list.map((file) => ({ file, state: "waiting", note: "" })));
    setSummary(files.length > MAX_BULK ? `${MAX_BULK} photos at a time, so only the first ${MAX_BULK} were picked.` : "");
  }

  async function run() {
    setPhase("running");
    stop.current = false;
    let ai = useAi;
    let added = 0;
    let lastAi = 0;
    for (const [i, it] of items.entries()) {
      if (stop.current) break;
      set(i, { state: "working", note: "Resizing and uploading…" });
      const uploaded: string[] = [];
      try {
        const { blob, ext } = await toProductPhoto(it.file);
        const photo = await upload("p", blob, ext);
        uploaded.push(photo);

        let fields: Partial<AutofillFields> = {};
        if (ai) {
          set(i, { note: "Reading the photo…" });
          const wait = lastAi + AI_GAP_MS - Date.now();
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          lastAi = Date.now();
          const res = await fetch("/api/autofill", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: photo }) });
          const body = (await res.json().catch(() => ({}))) as { fields?: AutofillFields; error?: string };
          if (res.ok && body.fields) fields = body.fields;
          else if (res.status === 429 || res.status === 503) {
            ai = false; // the free limit is used up: the rest are saved without suggestions
            setSummary("The AI limit was reached, so the remaining photos are saved without suggested names.");
          }
        }

        let cutout: string | undefined;
        if (makeCutouts) {
          set(i, { note: "Making the cut-out…" });
          try {
            const out = await toCutout(blob, { fromModel: true });
            cutout = await upload("c", out.blob, out.ext);
            uploaded.push(cutout);
          } catch {
            // A failed cut-out isn't worth losing the draft over; it can be made later in the editor.
          }
        }

        const r = await createDraft({
          photo, cutout, name: fields.name, category: fields.category ?? undefined, era: fields.era ?? undefined,
          colour: fields.colour || undefined, description: fields.description || undefined, stylingTip: fields.stylingTip || undefined,
        });
        if (!r.ok) throw new Error(r.error);
        added++;
        set(i, { state: "done", note: `${r.code}${fields.name ? `: ${fields.name}` : ""}`, code: r.code });
      } catch (e) {
        // Don't leave orphan files in storage (1 GB on the free plan).
        if (uploaded.length) await browserDb().storage.from(PHOTO.bucket).remove(uploaded);
        set(i, { state: "failed", note: e instanceof Error ? e.message : "This photo didn't save." });
      }
    }
    setPhase("done");
    setSummary((prev) => [
      added ? `${added} ${added === 1 ? "draft" : "drafts"} added. They're under Hidden: add price, size, condition and measurements, then set each live.` : "No drafts were added.",
      prev,
    ].filter(Boolean).join(" "));
    onDone(added);
  }

  // Closing mid-batch stops after the photo in progress; drafts already saved stay.
  function cancel() {
    stop.current = true;
    onClose();
  }
  useEffect(() => {
    cancelRef.current = cancel;
  });

  const doneCount = items.filter((it) => it.state === "done").length;
  return (
    <div className={d.editor}>
      <div className={d.edHead}>
        <h2 className="display" id="bulkTitle">Bulk add</h2>
        <button ref={closeRef} className={s.close} type="button" aria-label="Close bulk add" onClick={cancel}>×</button>
      </div>
      <div className={d.edBody}>
        <p className={d.muted}>
          One piece per photo, up to {MAX_BULK} at a time. Each becomes a hidden draft. Then open each one to add the price (and any
          other details you want), and set it live.
        </p>
        {phase === "pick" && (
          <>
            <button type="button" className={d.bulkPick} onClick={() => input.current?.click()}>
              <span aria-hidden="true">+</span>{items.length ? "Choose different photos" : "Choose photos"}
            </button>
            <input ref={input} className="sr-only-text" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden="true"
              onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
            <label className={d.check} htmlFor={ids.ai}>
              <input id={ids.ai} type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
              Suggest names and descriptions from the photos (AI)
            </label>
            <label className={d.check} htmlFor={ids.cut}>
              <input id={ids.cut} type="checkbox" checked={makeCutouts} onChange={(e) => setMakeCutouts(e.target.checked)} />
              Make cut-outs too (slower; the first time downloads a 44 MB model)
            </label>
          </>
        )}
        {phase === "done" && items.some((it) => it.code) && (
          <p className={d.muted}>Tap a piece to add its details. You come back here when you save.</p>
        )}
        {items.length > 0 && (
          <ol className={d.bulkList} aria-label="Photos">
            {items.map((it, i) => {
              // Once the batch is done, a saved piece opens in the editor; its line follows the dashboard's live data.
              const p = phase === "done" && it.code ? products.find((x) => x.code === it.code) : undefined;
              if (p) {
                const missing = missingForShop(p);
                return (
                  <li key={`${it.file.name}-${i}`} data-state={missing.length ? "done" : "ready"}>
                    {/* Named by its visible text (code, name, what it needs, "Edit"), so voice control can say what it sees (WCAG 2.5.3). */}
                    <button type="button" className={d.bulkEdit} onClick={(e) => onEdit(p.code, e.currentTarget)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photos[0] ? photoUrl(p.photos[0]) : ""} alt="" width={44} height={55} />
                      <span className={d.bulkText}>
                        <span className={d.bulkName}>{p.code} · {p.name}</span>
                        <span className={d.bulkNote}>
                          {missing.length ? `Needs ${missing.join(", ")}` : p.status === "live" ? "Live in the shop" : "Ready to go live, still hidden"}
                        </span>
                      </span>
                      <span className={d.bulkGo} aria-hidden="true">Edit</span>
                    </button>
                  </li>
                );
              }
              return (
                <li key={`${it.file.name}-${i}`} data-state={it.state}>
                  <span className={d.bulkName}>{it.file.name}</span>
                  <span className={d.bulkNote}>
                    {it.state === "waiting" ? "Waiting" : it.state === "done" ? `Saved as ${it.note}` : it.state === "failed" ? `Not saved: ${it.note}` : it.note}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className={d.edFoot}>
        <p className={d.muted} role="status" aria-live="polite">
          {phase === "running" ? `Working: ${doneCount} of ${items.length} saved…` : summary}
        </p>
        <div className={d.saveRow}>
          {phase === "pick" && (
            <>
              <button className={`${s.btn} ${s.secondary}`} type="button" onClick={cancel}>Cancel</button>
              <button className={`${s.btn} ${s.primary}`} type="button" disabled={!items.length} onClick={run}>
                {items.length ? `Add ${items.length} ${items.length === 1 ? "draft" : "drafts"}` : "Add drafts"}
              </button>
            </>
          )}
          {phase === "running" && <button className={`${s.btn} ${s.secondary}`} type="button" onClick={() => { stop.current = true; }}>Stop after this photo</button>}
          {phase === "done" && <button className={`${s.btn} ${s.primary}`} type="button" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}

export function BulkUpload({ open, trigger, onClose, onDone, onEdit, products }: {
  open: number | null; trigger: HTMLElement | null; onClose: () => void; onDone: (added: number) => void;
  onEdit: (code: string, trigger: HTMLElement) => void; products: TeamProduct[];
}) {
  const cancelRef = useRef<(() => void) | null>(null);
  return (
    <Overlay item={open} onClose={() => (cancelRef.current ?? onClose)()} trigger={trigger} kind="drawer" labelledBy="bulkTitle">
      {(n, closeRef) => <Bulk key={n} onClose={onClose} onDone={onDone} onEdit={onEdit} products={products} closeRef={closeRef} cancelRef={cancelRef} />}
    </Overlay>
  );
}
