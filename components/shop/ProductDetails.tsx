// Product details shared by the sheet over the shop and the /p/[code] page. No hooks, so it renders on server or client.
import { CONDITION_NOTE } from "@/lib/catalog";
import type { ShopProduct } from "@/lib/shop-model";
import { askAboutPiece, waLink } from "@/lib/wa";
import s from "./shop.module.css";

export function Gallery({ product, className = "" }: { product: ShopProduct; className?: string }) {
  const many = product.photos.length > 1;
  return (
    <div className={className}>
      {/* Photos are pre-sized WebP served as-is (D-011), so next/image optimisation isn't used. */}
      <div className={s.gallery} tabIndex={many ? 0 : undefined} aria-label={many ? `${product.photos.length} photos, swipe to see more` : undefined}>
        {product.photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={i === 0 ? product.name : `${product.name}, photo ${i + 1}`} width={720} height={900} />
        ))}
      </div>
      {many && <p className={`${s.galleryHint} mono`} aria-hidden="true">Swipe for more photos</p>}
    </div>
  );
}

export function ProductDetails({ product: p, whatsappNumber, titleId, heading = "h1" }: {
  product: ShopProduct; whatsappNumber: string; titleId?: string; heading?: "h1" | "h2";
}) {
  const ask = waLink(whatsappNumber, askAboutPiece(p));
  const Title = heading;
  return (
    <div className={s.detail}>
      <p className={`${s.meta} mono`}>{p.brand} · {p.era} · {p.category} · {p.code}</p>
      <Title className={`${s.title} display`} id={titleId}>{p.name}</Title>
      <p className={s.bigPrice}>{p.price} QAR</p>
      {p.status !== "live" && (
        <p className={`${s.status} ${p.status === "reserved" ? s.reserved : ""} mono`}>
          {p.status === "sold" ? "Sold" : "Reserved. Payment pending"}
        </p>
      )}
      <table className={s.table}>
        <tbody>
          <tr><td>Tagged size</td><td>{p.size}</td></tr>
          {p.measurements.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v} cm</td></tr>)}
          {p.colour && <tr><td>Colour</td><td>{p.colour}</td></tr>}
          <tr><td>Condition</td><td>{p.condition}</td></tr>
        </tbody>
      </table>
      <p className={s.note}>{CONDITION_NOTE[p.condition]} Measured flat. Lay a piece you own flat to compare.</p>
      {p.description && <p>{p.description}</p>}
      {p.stylingTip && <p className={s.note}>Styling tip: {p.stylingTip}</p>}
      <div className={s.actions}>
        {p.status !== "live" && <button className={`${s.btn} ${s.primary}`} type="button" disabled>{p.status === "sold" ? "Sold" : "Reserved"}</button>}
        {ask && <a className={`${s.btn} ${s.secondary}`} href={ask} target="_blank" rel="noopener">Ask about this piece</a>}
      </div>
    </div>
  );
}
