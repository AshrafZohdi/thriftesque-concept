"use client";
// Sections (D-060): the team names them (Basics, Jackets, Men's...) and orders them; the shop shows them as filter chips.
// Pieces are ticked into sections in the product editor. Edited here as a list and saved in one go.
import { useState } from "react";
import { saveSections } from "@/app/dashboard/actions";
import s from "@/components/shop/shop.module.css";
import { SECTIONS_MAX, type SectionInput, type TeamProduct } from "@/lib/dashboard";
import d from "./dashboard.module.css";

export function SectionsPanel({ initial, products, onSaved }: { initial: SectionInput[]; products: TeamProduct[]; onSaved: () => void }) {
  // Loaded once; after a save the panel carries on from the saved list (with new ids), keeping its message.
  const [list, setList] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const count = (id?: string) => (id ? products.filter((p) => p.section_ids?.includes(id)).length : 0);
  const set = (i: number, name: string) => setList(list.map((x, j) => (j === i ? { ...x, name } : x)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setList(next);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await saveSections(list);
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    setList(r.sections);
    setMsg("Saved. The shop shows the sections that have pieces in them.");
    onSaved();
  }

  return (
    <form className={d.settings} onSubmit={save} aria-labelledby="sectionsTitle" noValidate>
      <h2 className="display" id="sectionsTitle">Sections</h2>
      <p className={d.muted}>
        Groups like Basics, Jackets or Men&apos;s, shown as buttons above the shop. A piece can be in several: tick them when you edit
        the piece. A section shows in the shop once it has a piece. Removing a section doesn&apos;t delete its pieces. Pieces with a
        was price show under Sale automatically.
      </p>
      {list.map((x, i) => (
        <div className={d.sectionRow} key={x.id ?? `new-${i}`}>
          <input aria-label={`Section ${i + 1} name`} value={x.name} maxLength={30} placeholder="e.g. Basics" onChange={(e) => set(i, e.target.value)} />
          <span className={d.muted}>{x.id ? `${count(x.id)} ${count(x.id) === 1 ? "piece" : "pieces"}` : "New"}</span>
          <div className={d.sectionActs}>
            <button className={d.btnSm} type="button" aria-label={`Move ${x.name || `section ${i + 1}`} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button className={d.btnSm} type="button" aria-label={`Move ${x.name || `section ${i + 1}`} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button className={d.btnSm} type="button" aria-label={`Remove ${x.name || `section ${i + 1}`}`} onClick={() => setList(list.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      {list.length < SECTIONS_MAX && (
        <button className={d.btnSm} type="button" onClick={() => setList([...list, { name: "" }])}>+ Add section</button>
      )}
      <div className={d.saveRow}>
        <button className={`${s.btn} ${s.primary}`} type="submit" disabled={busy}>{busy ? "Saving" : "Save sections"}</button>
        <p className={d.muted} role="status">{msg}</p>
      </div>
    </form>
  );
}
