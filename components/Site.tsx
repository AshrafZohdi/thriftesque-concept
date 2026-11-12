// Page frame shared by the shop and product pages. Copy is the approved mockup copy (claims marked in content inventory C-8).
import Link from "next/link";
import type { ReactNode } from "react";
import { ChromeHeart } from "./Chrome";
import s from "./site.module.css";

function Ticker({ className, items, label }: { className: string; items: ReactNode; label?: string }) {
  return (
    <div className={`${s.ticker} ${className}`} aria-label={label} role={label ? "note" : undefined}>
      <div className={s.track} aria-hidden="true">
        <span>{items}</span>
        <span>{items}</span>
      </div>
    </div>
  );
}

export function Strip({ dropName }: { dropName: string }) {
  const notes = [dropName && `${dropName} is live`, "Order on WhatsApp", "Every piece is one of one", "New drop every Thursday, 8 pm"].filter(Boolean);
  return (
    <Ticker
      className={s.strip}
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
        <Link className={s.logo} href="/">
          <ChromeHeart />
          Thriftesque
        </Link>
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
  return <Ticker className={s.band} items={words} />;
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

export function HowToOrder() {
  return (
    <Section id="how" kicker="How to order" title="One WhatsApp message">
      <ol className={s.steps}>
        <li><h3>Add pieces to your bag</h3><p>Each item is a single piece. Adding it doesn&apos;t hold it, so send your order soon.</p></li>
        <li><h3>Send the order on WhatsApp</h3><p>Your bag turns into a ready-made message with every item, size and the total.</p></li>
        <li><h3>We confirm and deliver</h3><p>We reply to confirm your pieces, then arrange delivery or pickup.</p></li>
      </ol>
      <div className={s.info} id="info">
        <div><h3 className="mono">Delivery</h3><p>Across Qatar. Doha orders arrive within 24 hours. The fee is added to your order.</p></div>
        <div><h3 className="mono">Payment</h3><p>Cash on delivery or bank transfer. We share details when we confirm.</p></div>
        <div><h3 className="mono">Sizing</h3><p>Vintage sizes run differently. Every piece lists flat measurements in cm.</p></div>
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
          {/* Plain link: the dashboard shouldn't be prefetched on every shopper's visit. */}
          <a href="/login">Team dashboard</a>
        </nav>
        <small>Doha, Qatar</small>
      </div>
    </footer>
  );
}
