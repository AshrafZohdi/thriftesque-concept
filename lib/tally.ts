// Sends one anonymous count to /api/tally (D-067). Fire and forget: it never throws and never delays a tap. Off unless the
// target's vars switch shop stats on (lib/site.ts), so local builds, previews and tests send nothing.
import { shopStats } from "./site";
import type { StatEvent } from "./stats";

export function tally<E extends StatEvent>(name: E["name"], props: E["props"]): void {
  if (!shopStats || typeof window === "undefined") return;
  try {
    // text/plain keeps it a simple request; the route parses the JSON itself.
    const body = new Blob([JSON.stringify({ name, path: location.pathname, props })], { type: "text/plain" });
    if (navigator.sendBeacon?.("/api/tally", body)) return;
    void fetch("/api/tally", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Counting must never break the shop.
  }
}

// The pieces in a WhatsApp message, as counted: code and price only.
export const sentItems = (list: { code: string; price: number }[]) => list.map((p) => ({ code: p.code, price: p.price }));
