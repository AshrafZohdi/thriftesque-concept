"use client";
// One overlay for the product sheet, the look sheet and the bag drawer. Keeps the last content on screen while it animates out,
// then unmounts it, so a closed overlay can never sit invisibly over the page and swallow taps (mockup bug 1).
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "@/lib/useOverlay";
import s from "./shop.module.css";

export function Overlay<T>({ item, onClose, trigger, kind, labelledBy, label, children }: {
  item: T | null;
  onClose: () => void;
  trigger: HTMLElement | null;
  kind: "sheet" | "drawer";
  labelledBy?: string;
  label?: string;
  children: (item: T, closeRef: RefObject<HTMLButtonElement | null>) => ReactNode;
}) {
  const [shown, setShown] = useState<T | null>(item);
  const [leaving, setLeaving] = useState(false);
  if (item !== null && (item !== shown || leaving)) {
    setShown(item);
    setLeaving(false);
  } else if (item === null && shown !== null && !leaving) {
    setLeaving(true);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, 260);
    return () => clearTimeout(t);
  }, [leaving]);
  const closeRef = useOverlay(item !== null, onClose, trigger);
  if (shown === null) return null;
  return createPortal(
    <>
      <div className={`${s.scrim} ${leaving ? s.leaving : ""}`} onClick={onClose} />
      <div
        className={`${kind === "sheet" ? s.sheet : s.drawer} ${leaving ? s.leaving : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        // While animating out it's no longer a dialog for assistive tech or keyboard users.
        inert={leaving}
        aria-hidden={leaving || undefined}
      >
        {children(shown, closeRef)}
      </div>
    </>,
    document.body,
  );
}
