// Frame and helpers for the text pages (terms, privacy, about). Text comes from the page; shop facts from lib/shop-facts.ts.
import type { ReactNode } from "react";
import { BagButton } from "@/components/shop/BagDrawer";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { Footer, Header, Strip } from "@/components/Site";
import { LEGAL_UPDATED, type ShopFact } from "@/lib/shop-facts";
import { getShop } from "@/lib/shop";
import { waLink } from "@/lib/wa";
import s from "./legal.module.css";

// `updated` is the date under the title; the About page passes null (it's the team's own text, not a policy).
export async function LegalPage({ title, updated = LEGAL_UPDATED, children }: { title: string; updated?: string | null; children: ReactNode }) {
  const shop = await getShop();
  return (
    <ShopProvider products={shop.products} settings={shop.settings} hasBuilder={false}>
      <div data-page>
        <Strip dropName={shop.settings.dropName} />
        <Header right={<BagButton />} />
        <main className={`wrap ${s.page}`}>
          <p className="mono">Thriftesque</p>
          <h1 className="display">{title}</h1>
          {updated && <p className={`${s.updated} mono`}>Last updated {updated}</p>}
          <div className={s.body}>{children}</div>
        </main>
        <Footer waHref={waLink(shop.settings.whatsappNumber, "Hi Thriftesque!")} />
      </div>
    </ShopProvider>
  );
}

// A shop fact in running text. Details the team hasn't filled in are left off the page (D-050), so render nothing then.
export function Fact({ fact }: { fact: ShopFact }) {
  return fact.text ? <>{fact.text}</> : null;
}

// How to reach the shop: WhatsApp when the number is set, TikTok, and the contact email when the team has added one.
export function ContactLine({ whatsappNumber, email }: { whatsappNumber: string; email: ShopFact }) {
  const wa = waLink(whatsappNumber, "Hi Thriftesque, a question about my data or an order.");
  return (
    <>
      {wa ? <>Message us on <a href={wa} target="_blank" rel="noopener">WhatsApp</a> or</> : "Message us"} on{" "}
      <a href="https://www.tiktok.com/@thriftesque" target="_blank" rel="noopener">TikTok</a>
      {email.text ? <>, or email <a href={`mailto:${email.text}`}>{email.text}</a></> : null}.
    </>
  );
}
