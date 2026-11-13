"use client";
// Shown when a page fails to render (for example the database didn't answer). Plain words and a way back; the details go to
// the Worker logs, not the visitor.
import Link from "next/link";
import { useEffect } from "react";
import s from "@/components/shop/shop.module.css";

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("page error", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="wrap" style={{ paddingBlock: "72px" }}>
      <p className="mono">Something went wrong</p>
      <h1 className="display" style={{ fontSize: "clamp(44px, 12vw, 80px)", margin: "8px 0 12px" }}>This didn&apos;t load</h1>
      <p style={{ color: "var(--color-soft)", maxWidth: "40ch" }}>Please try again in a moment. If it keeps happening, message us on WhatsApp or TikTok.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <button className={`${s.btn} ${s.primary}`} type="button" onClick={reset}>Try again</button>
        <Link className={`${s.btn} ${s.secondary}`} href="/">Back to the shop</Link>
      </div>
    </main>
  );
}
