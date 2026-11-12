import { Band, Footer, Header, HowToOrder, Section, Strip } from "@/components/Site";
import { Catalog } from "@/components/shop/Catalog";
import { Hero } from "@/components/shop/Hero";
import { getShop } from "@/lib/shop";
import { waLink } from "@/lib/wa";

// Cached and refreshed only when the dashboard saves (revalidatePath, D-021).
export const revalidate = false;

export default async function ShopPage() {
  const { products, settings } = await getShop();
  const live = products.filter((p) => p.status === "live");
  const heroPiece = live.find((p) => p.cutout);
  return (
    <>
      <div data-page>
        <Strip dropName={settings.dropName} />
        <Header />
        <main>
          <Hero piece={heroPiece} liveCount={live.length} dropName={settings.dropName} />
          <Band dropName={settings.dropName} />
          <Section id="shop" kicker={settings.dropName || "This week"} title="The drop" intro="Tap a piece for measurements and condition.">
            <Catalog products={products} whatsappNumber={settings.whatsappNumber} />
          </Section>
          <HowToOrder />
        </main>
        <Footer waHref={waLink(settings.whatsappNumber, "Hi Thriftesque!")} />
      </div>
    </>
  );
}
