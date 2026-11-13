"use client";
// Last resort when the whole layout fails. It replaces the root layout, so it brings its own html and body, and loads the
// global styles itself for the colour tokens.
import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "var(--color-bg)", color: "var(--color-ink)" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "72px 16px" }}>
          <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>Thriftesque didn&apos;t load</h1>
          <p style={{ color: "var(--color-soft)" }}>Please try again in a moment.</p>
          <button type="button" onClick={reset}
            style={{ marginTop: 16, minHeight: 44, padding: "0 20px", font: "inherit", border: "1px solid var(--color-ink)", background: "var(--color-lime)", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
