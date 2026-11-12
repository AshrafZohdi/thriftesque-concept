// The chrome heart and star from option F. Drawn once as SVG symbols, reused everywhere with <use>.

export function ChromeDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="chromeG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--chrome-1)" />
          <stop offset=".28" stopColor="var(--chrome-2)" />
          <stop offset=".5" stopColor="var(--chrome-3)" />
          <stop offset=".72" stopColor="var(--chrome-4)" />
          <stop offset="1" stopColor="var(--chrome-5)" />
        </linearGradient>
        <symbol id="chromeHeart" viewBox="0 0 64 58">
          <path
            d="M32 56S2 38 2 18A15 15 0 0 1 32 10a15 15 0 0 1 30 8c0 20-30 38-30 38z"
            fill="url(#chromeG)"
            stroke="var(--chrome-edge)"
            strokeOpacity=".35"
          />
          <ellipse cx="18" cy="16" rx="7" ry="4" fill="var(--chrome-3)" opacity=".85" transform="rotate(-30 18 16)" />
        </symbol>
        <symbol id="chromeStar" viewBox="0 0 24 24">
          <path
            d="M12 0c.6 6.5 5.5 11.4 12 12-6.5.6-11.4 5.5-12 12-.6-6.5-5.5-11.4-12-12C6.5 11.4 11.4 6.5 12 0z"
            fill="url(#chromeG)"
            stroke="var(--chrome-edge)"
            strokeOpacity=".35"
            strokeWidth=".4"
          />
        </symbol>
      </defs>
    </svg>
  );
}

export function ChromeHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 58" aria-hidden="true" focusable="false">
      <use href="#chromeHeart" />
    </svg>
  );
}

export function ChromeStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <use href="#chromeStar" />
    </svg>
  );
}
