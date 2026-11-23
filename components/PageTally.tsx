"use client";
// Counts page and product views for the shop stats (D-067). A product sheet opened over the shop (/p/<code> pushed by
// ShopProvider) counts as a product view only, and closing it isn't a new page view. Team pages are never counted.
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cleanSource } from "@/lib/stats";
import { tally } from "@/lib/tally";

const PRODUCT = /^\/p\/(TQ-\d{4,})$/;

// Where this visit came from: ?utm_source= if a link carried one, else the other site's name (tiktok.com, instagram.com).
function landingSource(): string | undefined {
  const utm = cleanSource(new URLSearchParams(location.search).get("utm_source"));
  if (utm) return utm;
  try {
    const ref = document.referrer ? new URL(document.referrer).hostname : "";
    return ref && ref !== location.hostname ? cleanSource(ref) : undefined;
  } catch {
    return undefined;
  }
}

export function PageTally() {
  const pathname = usePathname();
  const counted = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) return;
    const code = PRODUCT.exec(pathname)?.[1];
    const inSheet = !!window.history.state?.tqSheet;
    if (!inSheet && pathname !== counted.current) {
      const landing = counted.current === null;
      counted.current = pathname;
      const source = landing ? landingSource() : undefined;
      tally("page_view", { ...(landing ? { landing: true as const } : {}), ...(source ? { source } : {}) });
    }
    if (code) tally("product_view", { code });
  }, [pathname]);

  return null;
}
