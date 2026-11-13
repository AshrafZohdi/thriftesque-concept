// Frame and helpers for the terms and privacy pages. Text comes from the page; shop facts from lib/shop-facts.ts.
import type { ReactNode } from "react";
import { BagButton } from "@/components/shop/BagDrawer";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { Footer, Header, Strip } from "@/components/Site";
import { LEGAL_UPDATED, type ShopFact } from "@/lib/shop-facts";
import { getShop } from "@/lib/shop";
import { waLink } from "@/lib/wa";
import s from "./legal.module.css";

export async function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const shop = await getShop();
  return (
    <ShopProvider products={shop.products} settings={shop.settings} hasBuilder={false}>
      <div data-page>
        <Strip dropName={shop.settings.dropName} />
        <Header right={<BagButton />} />
        <main className={`wrap ${s.page}`}>
          <p className="mono">Thriftesque</p>
          <h1 className="display">{title}</h1>
          <p className={`${s.updated} mono`}>Last updated {LEGAL_UPDATED}</p>
          <div className={s.body}>{children}</div>
        </main>
        <Footer waHref={waLink(shop.settings.whatsappNumber, "Hi Thriftesque!")} />
      </div>
    </ShopProvider>
  );
}

// A shop fact in running text. Until the client confirms it, a visible note says so instead of pretending.
export function Fact({ fact, missing }: { fact: ShopFact; missing: string }) {
  if (fact.confirmed) return <>{fact.text}</>;
  return (
    <>
      {fact.text ? `${fact.text} ` : `${missing} `}
      <span className={s.tbc}>To be confirmed</span>
    </>
  );
}

// How to reach the shop: WhatsApp when the number is set, and the contact email once confirmed.
export async function ContactLine() {
  const { settings } = await getShop();
  const wa = waLink(settings.whatsappNumber, "Hi Thriftesque, a question about my data.");
  return (
    <>
      {wa ? <>Message us on <a href={wa} target="_blank" rel="noopener">WhatsApp</a></> : "Message us on WhatsApp (number coming soon)"}
      {" "}or on <a href="https://www.tiktok.com/@thriftesque" target="_blank" rel="noopener">TikTok</a>.
    </>
  );
}
