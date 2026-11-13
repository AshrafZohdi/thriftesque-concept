"use client";
// Shared overlay behaviour: iOS-safe scroll lock, Escape to close, the page behind made inert, focus in and back out.
// Counted, because one overlay can open while another is still closing (Add to bag closes the sheet and opens the bag):
// only the last one to close unlocks the page.
// Stacked, because one overlay can open on top of another (the editor over Bulk add, D-051): only the top one answers Escape,
// the ones underneath are inert until it closes, and closing the top one returns focus to whatever opened it.
import { useEffect, useRef, type RefObject } from "react";

let openCount = 0;
let savedY = 0;
const stack: { id: symbol; panel: RefObject<HTMLElement | null> | undefined }[] = [];

function lockPage() {
  if (openCount++ > 0) return;
  savedY = window.scrollY;
  document.body.style.top = `-${savedY}px`;
  document.body.classList.add("locked");
  document.querySelector<HTMLElement>("[data-page]")?.setAttribute("inert", "");
}

function unlockPage(): boolean {
  if (--openCount > 0) return false;
  openCount = 0;
  document.querySelector<HTMLElement>("[data-page]")?.removeAttribute("inert");
  document.body.classList.remove("locked");
  document.body.style.top = "";
  window.scrollTo({ top: savedY, behavior: "instant" });
  return true;
}

export function useOverlay(open: boolean, onClose: () => void, trigger: HTMLElement | null, panel?: RefObject<HTMLElement | null>) {
  const first = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("overlay");
    stack.at(-1)?.panel?.current?.setAttribute("inert", "");
    stack.push({ id, panel });
    lockPage();
    const key = (e: KeyboardEvent) => e.key === "Escape" && stack.at(-1)?.id === id && close.current();
    window.addEventListener("keydown", key);
    const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", key);
      const wasTop = stack.at(-1)?.id === id;
      stack.splice(stack.findIndex((o) => o.id === id), 1);
      const below = stack.at(-1);
      if (wasTop) below?.panel?.current?.removeAttribute("inert");
      const last = unlockPage();
      // Only the overlay on top moves focus: one closing underneath a newer one (the sheet as the bag opens) leaves it alone.
      if (!wasTop) return;
      // Safari doesn't focus a button on click, so the opener is passed in rather than read from document.activeElement.
      // If the opener has gone (a button inside a sheet that closed), fall back to the overlay below, or a stable control
      // on the page such as the Bag button.
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      else if (below) below.panel?.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
      else if (last) document.querySelector<HTMLElement>("[data-focus-fallback]")?.focus({ preventScroll: true });
    };
  }, [open, trigger, panel]);

  return first;
}
