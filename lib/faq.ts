// Questions shoppers ask, answered only from what's true (D-058): how the shop works, plus the details the team filled in on
// the dashboard (D-048). A question whose answer isn't filled in is left out. Shown on the home page, and as FAQPage
// structured data for search engines and AI assistants.
import { LOCATION, SIZING, shopFacts, type ShopDetails } from "./shop-facts";

export type Faq = { q: string; a: string };

export function shopFaq(details: ShopDetails): Faq[] {
  const f = shopFacts(details);
  const list: (Faq | false)[] = [
    { q: "How do I order?", a: "Add pieces to your bag, then tap Send order on WhatsApp. Your bag becomes a ready-made message with each piece, its size and the total. We reply on WhatsApp to confirm your order." },
    { q: "Is every piece one of a kind?", a: "Yes. Everything is secondhand and one of one, so when a piece is sold it's gone. Adding it to your bag doesn't hold it, so send your order soon." },
    { q: "How do sizes work?", a: `${SIZING} Check them against a piece you own.` },
    f.delivery.confirmed && { q: "Do you deliver?", a: `${f.delivery.text} The fee for your area shows in your bag before you send the order.` },
    f.payment.confirmed && { q: "How do I pay?", a: f.payment.text },
    f.returns.confirmed && { q: "Can I return or exchange a piece?", a: f.returns.text },
    f.reservedHold.confirmed && { q: "Can you hold a piece for me?", a: `When you've ordered and payment is pending, we mark it reserved and hold it for ${f.reservedHold.text}.` },
    { q: "Where is Thriftesque?", a: `${LOCATION}. We sell through this website. Follow us on TikTok (@thriftesque) and Instagram (@thriftesqueqa) for new drops.` },
  ];
  return list.filter((x): x is Faq => Boolean(x));
}

export function faqJsonLd(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}
