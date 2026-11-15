import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import legal from "@/components/legal.module.css";
import s from "@/components/shop/shop.module.css";
import { aboutParagraphs, aboutSnippet } from "@/lib/about";
import { getShop } from "@/lib/shop";

// The team's own text from the dashboard (D-059), or a short default until they write it. Cached, refreshed on settings save.
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getShop();
  const description = aboutSnippet(aboutParagraphs(settings.about));
  return {
    title: "About | Thriftesque",
    description,
    alternates: { canonical: "/about" },
    openGraph: {
      type: "website", siteName: "Thriftesque", title: "About Thriftesque", description, url: "/about",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Thriftesque: pre-loved pieces, one of each" }],
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
      <p className={legal.cta}>
        <Link className={`${s.btn} ${s.primary}`} href="/">Browse the shop</Link>
      </p>
    </LegalPage>
  );
}
