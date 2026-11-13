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

// A shop fact in running text. Until the team fills it in (dashboard settings), a visible note says so instead of pretending.
export function Fact({ fact }: { fact: ShopFact }) {
  if (fact.confirmed) return <>{fact.text}</>;
  return (
    <>
      {fact.text ? `${fact.text} ` : ""}
      <span className={s.tbc}>To be confirmed</span>
    </>
  );
}

// How to reach the shop: WhatsApp when the number is set, TikTok, and the contact email once it's filled in.
export function ContactLine({ whatsappNumber, email }: { whatsappNumber: string; email: ShopFact }) {
  const wa = waLink(whatsappNumber, "Hi Thriftesque, a question about my data or an order.");
  return (
    <>
      {wa ? <>Message us on <a href={wa} target="_blank" rel="noopener">WhatsApp</a></> : "Message us on WhatsApp (number coming soon)"}
      {" "}or on <a href="https://www.tiktok.com/@thriftesque" target="_blank" rel="noopener">TikTok</a>, or email{" "}
      {email.confirmed ? <a href={`mailto:${email.text}`}>{email.text}</a> : <Fact fact={email} />}.
    </>
  );
}
