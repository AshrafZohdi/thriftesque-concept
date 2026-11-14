// Page frame shared by the shop and product pages. Copy is the approved mockup copy (claims marked in content inventory C-8).
import Link from "next/link";
import type { ReactNode } from "react";
import { ChromeHeart } from "./Chrome";
import { LOCATION, SIZING, shopFacts, type ShopDetails } from "@/lib/shop-facts";
import { MadeWithNuvai } from "./MadeWithNuvai";
import s from "./site.module.css";

// Endless scrolling strip. Each half holds several copies so it's wider than any screen (one copy of the strip is about
// 770 px, the band about 1,180 px), then the track slides by exactly one half, so there's never an empty gap.
// The time scales with the copies, so the speed stays the same.
const COPIES = 5;
function Ticker({ className, items, label, secondsPerCopy }: { className: string; items: ReactNode; label?: string; secondsPerCopy: number }) {
  const half = (
    <span>
      {Array.from({ length: COPIES }, (_, i) => <span key={i}>{items}</span>)}
    </span>
  );
  return (
    <div className={`${s.ticker} ${className}`} aria-label={label} role={label ? "note" : undefined}>
      <div className={s.track} aria-hidden="true" style={{ animationDuration: `${secondsPerCopy * COPIES}s` }}>
        {half}
        {half}
      </div>
    </div>
  );
}

export function Strip({ dropName }: { dropName: string }) {
  const notes = [dropName && `${dropName} is live`, "Order on WhatsApp", "Every piece is one of one", "New drop every Thursday, 8 pm"].filter(Boolean);
  return (
    <Ticker
      className={s.strip}
      secondsPerCopy={38}
      label={notes.join(". ")}
      items={notes.map((n) => (
        <span key={n}>
          {n} <span>+++</span>
        </span>
      ))}
    />
  );
}

export function Header({ right, nav = [["/#shop", "The drop"], ["/#how", "How to order"]] }: { right?: ReactNode; nav?: [href: string, label: string][] }) {
  return (
    <header className={s.header}>
      <div className={s.headerIn}>
        <div className={s.brand}>
          <Link className={s.logo} href="/">
            <ChromeHeart />
            Thriftesque
          </Link>
          <MadeWithNuvai paper="var(--color-surface)" ink="var(--color-ink)" />
        </div>
        <nav className={`${s.nav} mono`} aria-label="Main">
          {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        {right ?? (
          <Link className={s.cell} href="/#shop">
            Shop
          </Link>
        )}
      </div>
    </header>
  );
}

export function Band({ dropName }: { dropName: string }) {
  const words = (
    <>
      <span className={s.lime}>Thriftesque</span> {dropName && <span className={s.grey}>{dropName}</span>} One of one{" "}
      <span className={s.lime}>+++</span> Doha <span className={s.grey}>Pre-loved</span>
    </>
  );
  return <Ticker className={s.band} secondsPerCopy={30} items={words} />;
}

export function Section({ id, kicker, title, intro, children, className = "" }: {
  id?: string; kicker: string; title: string; intro?: ReactNode; children: ReactNode; className?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section className={`${s.block} ${className}`} id={id} aria-labelledby={titleId}>
      <div className="wrap">
        <div className={s.head}>
          <span className={`${s.chipOut} mono`}>{kicker}</span>
          <h2 className="display" id={titleId}>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function HowToOrder({ details }: { details: ShopDetails }) {
  const facts = shopFacts(details);
  return (
    <Section id="how" kicker="How to order" title="One WhatsApp message">
      <ol className={s.steps}>
        <li><h3>Add pieces to your bag</h3><p>Each item is a single piece. Adding it doesn&apos;t hold it, so send your order soon.</p></li>
        <li><h3>Send the order on WhatsApp</h3><p>Your bag turns into a ready-made message with every item, size and the total.</p></li>
        <li><h3>We confirm and deliver</h3><p>We reply to confirm your pieces, then arrange delivery or pickup.</p></li>
      </ol>
      <div className={s.info} id="info">
        <div><h3 className="mono">Delivery</h3><p>{facts.delivery.text}</p></div>
        <div><h3 className="mono">Payment</h3><p>{facts.payment.text}</p></div>
        <div><h3 className="mono">Sizing</h3><p>{SIZING}</p></div>
      </div>
    </Section>
  );
}

export function Footer({ waHref }: { waHref: string | null }) {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.footerIn}`}>
        <Link className={s.logo} href="/">
          <ChromeHeart />
          Thriftesque
        </Link>
        <nav className={`${s.footerNav} mono`} aria-label="Links">
          <a href="https://www.tiktok.com/@thriftesque" target="_blank" rel="noopener">TikTok</a>
          {waHref && <a href={waHref} target="_blank" rel="noopener">WhatsApp</a>}
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          {/* Plain link: the dashboard shouldn't be prefetched on every shopper's visit. */}
          <a href="/login">Team dashboard</a>
        </nav>
        <div className={s.footerBase}>
          <small>{LOCATION}</small>
          <MadeWithNuvai height={14} paper="var(--color-ink)" ink="var(--color-surface)" />
        </div>
      </div>
    </footer>
  );
}

// Questions and answers from lib/faq.ts. Native <details>, so it works without JavaScript and with the keyboard.
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Section id="faq" kicker="FAQ" title="Good to know">
      <div className={s.faq}>
        {items.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
