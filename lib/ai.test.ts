import { describe, expect, it } from "vitest";
import { cleanAutofill, looksPrompt, validLooks, type LookPiece } from "./ai";

describe("cleanAutofill", () => {
  it("keeps good fields, trims, and removes em dashes", () => {
    expect(cleanAutofill({ name: " Navy stripe ringer tee ", category: "Tops", colour: "Navy and cream", era: "90s",
      description: "Cotton jersey \u2014 ribbed collar.", styling_tip: "Tuck into wide jeans." })).toEqual({
      name: "Navy stripe ringer tee", category: "Tops", colour: "Navy and cream", era: "90s",
      description: "Cotton jersey, ribbed collar.", stylingTip: "Tuck into wide jeans.",
    });
  });
  it("turns off-list categories and eras into null for the team to pick", () => {
    const r = cleanAutofill({ name: "Hat", category: "Hats", era: "1950s" });
    expect(r).toMatchObject({ category: null, era: null, colour: "", description: "" });
  });
  it("refuses garbage", () => {
    expect(cleanAutofill(null)).toBeNull();
    expect(cleanAutofill("text")).toBeNull();
    expect(cleanAutofill({ name: "   " })).toBeNull();
  });
});

const pieces: LookPiece[] = [
  { code: "TQ-0001", name: "Ringer tee", category: "Tops", colour: "Navy", era: "90s", size: "M" },
  { code: "TQ-0002", name: "Jeans", category: "Bottoms", colour: null, era: "90s", size: "W30" },
  { code: "TQ-0003", name: "Boots", category: "Shoes", colour: "Black", era: "2010s", size: "EU 40" },
  { code: "TQ-0004", name: "Dress", category: "Dresses", colour: "Blue", era: "90s", size: "M" },
  { code: "TQ-0005", name: "Jacket", category: "Outerwear", colour: "Green", era: "2000s", size: "M" },
];

describe("validLooks", () => {
  const look = (title: string, codes: string[]) => ({ title, note: "n", codes });
  it("keeps only looks that follow the slot rules with codes we sent", () => {
    const raw = { looks: [
      look("Top and jeans", ["TQ-0001", "TQ-0002", "TQ-0003"]),
      look("Dress and boots", ["TQ-0004", "TQ-0003"]),
      look("Two tops", ["TQ-0001", "TQ-0005", "TQ-0002"]),
      look("Made-up code", ["TQ-9999", "TQ-0002"]),
      look("Dress with jeans", ["TQ-0004", "TQ-0002"]),
      look("No bottom", ["TQ-0001", "TQ-0003"]),
      look("", ["TQ-0005", "TQ-0002"]),
      look("Dress alone", ["TQ-0004"]),
    ] };
    const r = validLooks(raw, pieces, []);
    expect(r.looks.map((l) => l.title)).toEqual(["Top and jeans", "Dress and boots"]);
    expect(r.rejected).toBe(6);
  });
  it("drops repeats of existing looks and of each other", () => {
    const raw = { looks: [look("Again", ["TQ-0003", "TQ-0004"]), look("New", ["TQ-0005", "TQ-0002"]), look("Same new", ["TQ-0002", "TQ-0005"])] };
    expect(validLooks(raw, pieces, [["TQ-0004", "TQ-0003"]]).looks.map((l) => l.title)).toEqual(["New"]);
  });
  it("survives garbage", () => {
    expect(validLooks(null, pieces, []).looks).toEqual([]);
    expect(validLooks({ looks: "nope" }, pieces, []).looks).toEqual([]);
  });
});

describe("prompts carry product facts only", () => {
  it("lists the codes and nothing about customers", () => {
    const p = looksPrompt(pieces);
    expect(p).toContain("TQ-0001 | Tops | Ringer tee | Navy | 90s | size M");
    expect(p).not.toMatch(/customer|phone|name:/i);
  });
});
