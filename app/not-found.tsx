import Link from "next/link";
import s from "@/components/shop/shop.module.css";

export default function NotFound() {
  return (
    <main className="wrap" style={{ paddingBlock: "72px" }}>
      <p className="mono">404</p>
      <h1 className="display" style={{ fontSize: "clamp(44px, 12vw, 80px)", margin: "8px 0 12px" }}>This piece isn&apos;t here</h1>
      <p style={{ color: "var(--color-soft)", maxWidth: "40ch" }}>It may have sold, or the link is wrong. Every piece is one of one, so have a look at what&apos;s in the drop now.</p>
      <Link className={`${s.btn} ${s.primary}`} href="/#shop" style={{ marginTop: 16 }}>Shop the drop</Link>
    </main>
  );
}
