import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, Fact, LegalPage } from "@/components/LegalPage";
import { getShop } from "@/lib/shop";
import { shopFacts } from "@/lib/shop-facts";

// How ordering works, in plain words. Shop facts the client hasn't confirmed yet are marked on the page (D-046).
export const revalidate = false;

export const metadata: Metadata = {
  title: "Terms | Thriftesque",
  description: "How ordering from Thriftesque works: one-of-one pieces, orders on WhatsApp, prices in QAR, delivery and payment.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const { settings } = await getShop();
  const facts = shopFacts(settings.details);
  return (
    <LegalPage title="Terms">
      <p>
        These terms cover buying from Thriftesque through this website and WhatsApp. The shop is run by{" "}
        <Fact fact={facts.operator} />. By sending us an order you agree to them.
      </p>

      <h2 className="display">The pieces</h2>
      <ul>
        <li>Everything is secondhand and one of one. When a piece is sold, it&apos;s gone.</li>
        <li>
          Photos show the actual piece. Measurements are taken laid flat, in cm, and each piece has a condition grade. We
          describe wear and flaws as honestly as we can; vintage sizes run differently, so check the measurements.
        </li>
        <li>Prices are in Qatari riyals (QAR).</li>
      </ul>

      <h2 className="display">Ordering</h2>
      <ul>
        <li>Adding a piece to your bag doesn&apos;t hold it. Someone else can order it first.</li>
        <li>
          Your order is a WhatsApp message to us. It&apos;s accepted only when we reply to confirm the pieces are yours. If a
          piece has gone in the meantime, we tell you and you don&apos;t pay for it.
        </li>
        <li>
          While payment is pending we may mark a piece as reserved. We hold it for{" "}
          <Fact fact={facts.reservedHold} />.
        </li>
      </ul>

      <h2 className="display">Delivery and pickup</h2>
      <p>
        <Fact fact={facts.delivery} /> The fee for your area is shown in your bag before you send the order.
        Pickup is free; we share the location when we confirm.
      </p>

      <h2 className="display">Payment</h2>
      <p><Fact fact={facts.payment} /></p>

      <h2 className="display">Returns and exchanges</h2>
      <p><Fact fact={facts.returns} /></p>

      <h2 className="display">Using this website</h2>
      <p>
        The photos, text and design on this site belong to Thriftesque. Please don&apos;t copy them for commercial use. We
        work to keep the site accurate and available, but a piece can sell between when you load a page and when you order.
        How we handle your information is on the <Link href="/privacy">privacy page</Link>.
      </p>

      <h2 className="display">Law and questions</h2>
      <p>
        These terms are governed by the laws of the State of Qatar. Questions about an order or these terms: <ContactLine whatsappNumber={settings.whatsappNumber} email={facts.contactEmail} />
      </p>
    </LegalPage>
  );
}
