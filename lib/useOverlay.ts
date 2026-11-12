"use client";
// Shared overlay behaviour: iOS-safe scroll lock, Escape to close, the page behind made inert, focus in and back out.
import { useEffect, useRef } from "react";

export function useOverlay(open: boolean, onClose: () => void, trigger: HTMLElement | null) {
  const first = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body;
    body.style.top = `-${y}px`;
    body.classList.add("locked");
    const page = document.querySelector<HTMLElement>("[data-page]");
    page?.setAttribute("inert", "");
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", key);
    const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", key);
      page?.removeAttribute("inert");
      body.classList.remove("locked");
      body.style.top = "";
      window.scrollTo({ top: y, behavior: "instant" });
      // Safari doesn't focus a button on click, so the opener is passed in rather than read from document.activeElement.
      trigger?.focus({ preventScroll: true });
    };
  }, [open, trigger]);

  return first;
}
