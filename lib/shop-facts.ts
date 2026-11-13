// Facts about how the shop works, in one place: the home page, the terms and the privacy page all read them from here.
// A fact stays `confirmed: false` until the client confirms it (content inventory). Unconfirmed facts show a visible
// "To be confirmed" note on the legal pages, and the deploy refuses to leave preview mode while any remain (check-facts.ts).
export type ShopFact = { text: string; confirmed: boolean; ref: string };

export const FACTS = {
  location: { text: "Doha, Qatar", confirmed: true, ref: "" },
  operator: { text: "Thriftesque, a secondhand clothing shop in Doha, Qatar", confirmed: false, ref: "C-13: registered business name, if any" },
  contactEmail: { text: "", confirmed: false, ref: "C-14: public contact email for privacy requests" },
  delivery: { text: "Across Qatar. Doha orders arrive within 24 hours. The fee is added to your order.", confirmed: false, ref: "C-8" },
  payment: { text: "Cash on delivery or bank transfer. We share details when we confirm.", confirmed: false, ref: "C-3" },
  sizing: { text: "Vintage sizes run differently. Every piece lists flat measurements in cm.", confirmed: true, ref: "" },
  returns: { text: "", confirmed: false, ref: "C-10: returns or exchanges, or all sales final" },
  reservedHold: { text: "", confirmed: false, ref: "C-15: how long a reserved piece is held while payment is pending" },
  orderRetention: { text: "", confirmed: false, ref: "C-16: how long order chats and delivery details are kept" },
} satisfies Record<string, ShopFact>;

export function unconfirmedFacts(): [string, ShopFact][] {
  return Object.entries(FACTS).filter(([, f]) => !f.confirmed);
}

// When the legal pages were last changed. Update it with any change to their wording.
export const LEGAL_UPDATED = "13 November 2026";
