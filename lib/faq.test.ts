import { describe, expect, it } from "vitest";
import { faqJsonLd, shopFaq } from "./faq";
import { EMPTY_DETAILS } from "./shop-facts";

describe("shopFaq (D-058)", () => {
  it("answers only what's true: details left empty on the dashboard are left out", () => {
    const qs = shopFaq(EMPTY_DETAILS).map((f) => f.q);
    expect(qs).toEqual(["How do I order?", "Is every piece one of a kind?", "How do sizes work?", "Where is Thriftesque?"]);
  });
  it("uses the team's own wording when they've filled it in", () => {
    const faq = shopFaq({ ...EMPTY_DETAILS, deliveryText: "Across Qatar, 1 to 2 days.", returnsText: "All sales are final.", reservedHoldText: "24 hours" });
    expect(faq.find((f) => f.q === "Do you deliver?")!.a).toMatch(/^Across Qatar, 1 to 2 days\. The fee for your area/);
    expect(faq.find((f) => f.q === "Can you hold a piece for me?")!.a).toContain("hold it for 24 hours.");
    expect(faq.some((f) => f.q === "How do I pay?")).toBe(false);
  });
  it("becomes FAQPage structured data", () => {
    const data = faqJsonLd(shopFaq(EMPTY_DETAILS));
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(4);
    expect(data.mainEntity[0]).toMatchObject({ "@type": "Question", name: "How do I order?", acceptedAnswer: { "@type": "Answer" } });
  });
});
