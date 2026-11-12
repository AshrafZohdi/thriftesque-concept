"use client";
// Shared overlay behaviour: iOS-safe scroll lock, Escape to close, the page behind made inert, focus in and back out.
// Counted, because one overlay can open while another is still closing (Add to bag closes the sheet and opens the bag):
// only the last one to close unlocks the page and returns focus.
import { useEffect, useRef } from "react";

let openCount = 0;
let savedY = 0;

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

export function useOverlay(open: boolean, onClose: () => void, trigger: HTMLElement | null) {
  const first = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    lockPage();
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", key);
    const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", key);
      // Safari doesn't focus a button on click, so the opener is passed in rather than read from document.activeElement.
      // If the opener has gone (a button inside a sheet that closed), fall back to a stable control such as the Bag button.
      const target = trigger?.isConnected ? trigger : document.querySelector<HTMLElement>("[data-focus-fallback]");
      if (unlockPage()) target?.focus({ preventScroll: true });
    };
  }, [open, trigger]);

  return first;
}
