import { describe, expect, it } from "vitest";
import { searchShop, searchWords, type Searchable } from "./search";

const p = (code: string, over: Partial<Searchable>): Searchable => ({
  code, name: "", brand: "Unbranded", category: "Tops", colour: null, era: "90s", size: "M", description: null, wasPrice: null, sections: [], ...over,
});
const list = [
  p("TQ-0001", { name: "Y2K Victoria's Secret teal hoodie", brand: "Victoria's Secret", category: "Outerwear", colour: "Teal" }),
  p("TQ-0002", { name: "Rigid dark wash straight jeans", category: "Bottoms" }),
  p("TQ-0003", { name: "Rochas monogram shoulder bag", brand: "Rochas", category: "Bags", wasPrice: 250 }),
  p("TQ-0004", { name: "Black patent tote", category: "Bags", colour: "Black" }),
  p("TQ-0005", { name: "Striped tee", description: "Soft cotton, looks great with black jeans." }),
  p("TQ-0006", { name: "Cargo trousers", category: "Bottoms", sections: ["m1"] }),
];
const sections = new Map([["m1", "Men's"]]);
const codes = (q: string) => searchShop(list, q, sections).map((x) => x.code);

describe("shop search (D-064)", () => {
  it("finds by name, brand and colour, ignoring case and punctuation", () => {
    expect(codes("rochas")).toEqual(["TQ-0003"]);
    expect(codes("VICTORIA'S")).toEqual(["TQ-0001"]);
    expect(codes("teal")).toEqual(["TQ-0001"]);
  });
  it("understands everyday words for categories, in singular or plural", () => {
    expect(codes("bags")).toEqual(["TQ-0003", "TQ-0004"]);
    expect(codes("jacket")).toEqual(["TQ-0001"]);
    expect(codes("pants")).toEqual(["TQ-0002", "TQ-0006"]);
  });
  it("matches specific garments by the piece itself, not its whole category", () => {
    expect(codes("tote")).toEqual(["TQ-0004"]); // not the shoulder bag
    expect(codes("jeans")).toEqual(["TQ-0002", "TQ-0005"]); // not the cargo trousers
  });
  it("needs every word to match, so more words narrow it", () => {
    expect(codes("black bag")).toEqual(["TQ-0004"]);
  });
  it("puts pieces matched by their own details before category matches, and those before description mentions", () => {
    expect(codes("trousers")).toEqual(["TQ-0006", "TQ-0002"]); // named "Cargo trousers" first, then the jeans by category
    expect(codes("jeans")[1]).toBe("TQ-0005"); // the tee only mentions jeans in its description, so it comes last
  });
  it("finds sections, codes and sale pieces", () => {
    expect(codes("mens")).toEqual(["TQ-0006"]);
    expect(codes("tq-0004")).toEqual(["TQ-0004"]);
    expect(codes("sale")).toEqual(["TQ-0003"]);
  });
  it("matches word starts, not the middle of words", () => {
    expect(codes("ripe")).toEqual([]); // not "Striped"
    expect(searchWords("  Dresses, BAGS ")).toEqual(["dress", "bag"]);
  });
  it("shows everything for an empty search", () => {
    expect(codes("  ")).toHaveLength(list.length);
  });
});
