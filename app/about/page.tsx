import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import legal from "@/components/legal.module.css";
import s from "@/components/shop/shop.module.css";
import { aboutParagraphs, aboutSnippet } from "@/lib/about";
import { getShop } from "@/lib/shop";
import { photoUrl } from "@/lib/supabase/public";

// The team's own text from the dashboard (D-059), or a short default until they write it, and their photos (D-060). Cached,
// refreshed on settings save.
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getShop();
  const description = aboutSnippet(aboutParagraphs(settings.about));
  // The first About photo makes the share card when there is one (4:5, so WhatsApp shows it as a square-ish preview).
  const first = settings.aboutPhotos[0];
  const image = first
    ? { url: photoUrl(first.path), width: 720, height: 900, alt: first.alt || "Thriftesque" }
    : { url: "/og.jpg", width: 1200, height: 630, alt: "Thriftesque: pre-loved pieces, one of each" };
  return {
    title: "About | Thriftesque",
    description,
    alternates: { canonical: "/about" },
    openGraph: {
      type: "website", siteName: "Thriftesque", title: "About Thriftesque", description, url: "/about",
      images: [image],
    },
  };
}

export default async function AboutPage() {
  const { settings } = await getShop();
  return (
    <LegalPage title="About us" updated={null}>
      {aboutParagraphs(settings.about).map((p, i) => (
        <p key={i} className={legal.lines}>{p}</p>
      ))}
      {settings.aboutPhotos.length > 0 && (
        <div className={legal.photos}>
          {settings.aboutPhotos.map((ph, i) => (
            // Pre-sized WebP served as-is (D-011). The first two load straight away; the rest when scrolled near.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={ph.path} src={photoUrl(ph.path)} alt={ph.alt || `Thriftesque, photo ${i + 1}`} width={720} height={900} loading={i < 2 ? "eager" : "lazy"} />
          ))}
        </div>
      )}
      <p className={legal.cta}>
        <Link className={`${s.btn} ${s.primary}`} href="/">Browse the shop</Link>
      </p>
    </LegalPage>
  );
}
