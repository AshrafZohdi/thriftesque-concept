"use client";
// "Make cut-outs" (D-053): pieces uploaded without a cut-out can't appear in the outfit builder or looks. This makes them all
// in one go, in this browser, with the same model as the editor's "Make cut-out from cover" (D-036): one piece at a time, the
// first run downloads the 44 MB model. Each cut-out is saved as soon as it's made, so stopping keeps what's done.
import { useRef, useState } from "react";
import { saveCutout } from "@/app/dashboard/actions";
import s from "@/components/shop/shop.module.css";
import type { TeamProduct } from "@/lib/dashboard";
import { toCutout } from "@/lib/image";
import { PHOTO } from "@/lib/photo-spec";
import { browserDb } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/supabase/public";
import d from "./dashboard.module.css";
import { upload } from "./ProductEditor";

// Pieces customers can see, with a photo and no cut-out.
export const needsCutout = (list: TeamProduct[]) => list.filter((p) => p.status !== "hidden" && p.status !== "sold" && !p.cutout && p.photos[0]);

export function CutoutBatch({ products, onSaved }: { products: TeamProduct[]; onSaved: () => void }) {
  const todo = needsCutout(products);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const stop = useRef(false);

  async function run() {
    const list = needsCutout(products);
    setRunning(true);
    stop.current = false;
    let made = 0;
    let failed = 0;
    for (const [i, p] of list.entries()) {
      if (stop.current) break;
      setMsg(`Making cut-outs: ${i + 1} of ${list.length} (${p.code} ${p.name})${i === 0 ? ". The first one downloads the model, so it takes longer." : ""}`);
      let path = "";
      try {
        const blob = await (await fetch(photoUrl(p.photos[0]))).blob();
        const out = await toCutout(blob, { fromModel: true });
        path = await upload("c", out.blob, out.ext);
        const r = await saveCutout(p.code, path);
        if (!r.ok) throw new Error(r.error);
        made++;
      } catch {
        if (path) await browserDb().storage.from(PHOTO.bucket).remove([path]);
        failed++;
      }
    }
    setRunning(false);
    setMsg(
      `${made} ${made === 1 ? "cut-out" : "cut-outs"} made${failed ? `, ${failed} didn't work (try those in the piece's editor)` : ""}${stop.current ? ", stopped early" : ""}. ` +
        "Check a few in the outfit builder; if one looks wrong, open the piece and upload your phone's \"lift subject\" cut-out instead.",
    );
    onSaved();
  }

  if (!todo.length && !msg) return null;
  return (
    <section className={d.settings} aria-labelledby="cutoutsTitle">
      <h2 className="display" id="cutoutsTitle">Cut-outs</h2>
      {todo.length > 0 && (
        <p className={d.muted}>
          {todo.length} {todo.length === 1 ? "piece in the shop has" : "pieces in the shop have"} no cut-out yet, so{" "}
          {todo.length === 1 ? "it can't" : "they can't"} appear in the outfit builder or in looks. Making them runs on this device: best on a
          laptop, about 4 seconds a piece after a one-time 44 MB download. Keep this page open while it works.
        </p>
      )}
      <div className={d.saveRow}>
        {!running && todo.length > 0 && (
          <button className={`${s.btn} ${s.primary}`} type="button" onClick={run}>
            Make {todo.length} {todo.length === 1 ? "cut-out" : "cut-outs"}
          </button>
        )}
        {running && <button className={`${s.btn} ${s.secondary}`} type="button" onClick={() => { stop.current = true; }}>Stop after this one</button>}
        <p className={d.muted} role="status" aria-live="polite">{msg}</p>
      </div>
    </section>
  );
}
