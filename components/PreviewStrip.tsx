import s from "./PreviewStrip.module.css";

// Shown on every page while the domain carries sample pieces (D-044). Removed by turning preview mode off.
export function PreviewStrip() {
  return <p className={s.strip}>Preview: these are sample pieces, not for sale yet. The shop opens soon.</p>;
}
