import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header, Strip } from "@/components/Site";
import { BagButton } from "@/components/shop/BagDrawer";
import { ProductActions } from "@/components/shop/ProductActions";
import { Gallery, ProductDetails } from "@/components/shop/ProductDetails";
import { ShopProvider } from "@/components/shop/ShopProvider";
import s from "@/components/shop/shop.module.css";
import { getShop } from "@/lib/shop";
import { waLink } from "@/lib/wa";

// Rendered on first visit, then cached until the dashboard changes the shop (D-021).
export const revalidate = false;
export function generateStaticParams() {
  return [];
}

// The whole shop is loaded (one cached set of queries) so the bag works here too. Hidden pieces aren't in it, so they 404.
async function find(code: string) {
  const shop = await getShop();
  const product = shop.products.find((p) => p.code === code);
  return product ? { product, shop } : null;
}

export async function generateMetadata({ params }: PageProps<"/p/[code]">): Promise<Metadata> {
  const { code } = await params;
  const data = await find(code);
  if (!data) return { title: "Not found | Thriftesque" };
  const p = data.product;
  const state = p.status === "sold" ? " (sold)" : p.status === "reserved" ? " (reserved)" : "";
  const title = `${p.name}, ${p.price} QAR${state} | Thriftesque`;
  const description = `Size ${p.size} · ${p.condition} · ${p.era}. One of one, order on WhatsApp.`;
  return {
    title,
    description,
    alternates: { canonical: `/p/${p.code}` },
    // WhatsApp and TikTok read these for the link preview card.
    openGraph: { type: "website", siteName: "Thriftesque", title, description, url: `/p/${p.code}`, images: p.photos[0] ? [{ url: p.photos[0], width: 720, height: 900, alt: p.name }] : [] },
    twitter: { card: "summary_large_image", title, description, images: p.photos[0] ? [p.photos[0]] : [] },
  };
}

export default async function ProductPage({ params }: PageProps<"/p/[code]">) {
  const { code } = await params;
  const data = await find(code);
  if (!data) notFound();
  const { product, shop } = data;
  return (
    <ShopProvider products={shop.products} settings={shop.settings} hasBuilder={false}>
      <div data-page>
        <Strip dropName={shop.settings.dropName} />
        <Header right={<BagButton />} />
        <main className={`wrap ${s.page}`}>
          <Link className={`${s.back} mono`} href="/#shop">← Back to the drop</Link>
          <Gallery product={product} className={s.pagePhotos} />
          <ProductDetails product={product} actions={<ProductActions product={product} />} />
        </main>
        <Footer waHref={waLink(shop.settings.whatsappNumber, "Hi Thriftesque!")} />
      </div>
    </ShopProvider>
  );
}
