"use client";
// Search in the header (D-064). On the shop page it scrolls to the drop and puts the cursor in its search box (the box sits in
// the drop's sticky bar); on other pages it's a plain link to the drop.
import Link from "next/link";
export const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" strokeLinecap="square" />
  </svg>
);

export function SearchButton({ className }: { className: string }) {
  return (
    <Link
      className={className}
      href="/#shop"
      aria-label="Search the shop"
      onClick={(e) => {
        const input = document.getElementById("shop-search");
        const drop = document.getElementById("shop");
        if (!input || !drop) return;
        e.preventDefault();
        // Already scrolled into the drop: the box is stuck under the header, so only focus it. Otherwise bring the drop up.
        const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
        if (input.getBoundingClientRect().top > header + 24 || input.getBoundingClientRect().top < header) {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: drop.getBoundingClientRect().top + window.scrollY - header, behavior: reduce ? "auto" : "smooth" });
        }
        // Focus in the tap itself, so phones open the keyboard.
        input.focus({ preventScroll: true });
      }}
    >
      <SearchIcon />
    </Link>
  );
}
