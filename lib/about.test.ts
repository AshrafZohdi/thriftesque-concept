import { describe, expect, it } from "vitest";
import { ABOUT_DEFAULT, ABOUT_MAX, aboutParagraphs, aboutSnippet, validateAbout } from "./about";

describe("about page text (D-059)", () => {
  it("shows the default until the team writes their own", () => {
    expect(aboutParagraphs("")).toEqual(ABOUT_DEFAULT);
    expect(aboutParagraphs(" \n\n ")).toEqual(ABOUT_DEFAULT);
  });

  it("splits on blank lines and keeps single line breaks inside a paragraph", () => {
    expect(aboutParagraphs("We started in 2024.\n\nLine one\nline two\n\n\n")).toEqual(["We started in 2024.", "Line one\nline two"]);
  });

  it("cleans the text: Windows line breaks, extra blank lines, em dashes", () => {
    expect(validateAbout("  Hi\r\n\r\n\r\n\r\nThere — we are  ")).toEqual({ ok: true, value: "Hi\n\nThere, we are" });
  });

  it("refuses text over the database limit", () => {
    expect(validateAbout("x".repeat(ABOUT_MAX)).ok).toBe(true);
    expect(validateAbout("x".repeat(ABOUT_MAX + 1))).toMatchObject({ ok: false, error: expect.stringMatching(/^About us: 3000/) });
  });

  it("makes a description of at most 160 characters", () => {
    expect(aboutSnippet(["Short."])).toBe("Short.");
    const long = `${"A sentence about the shop that goes on. ".repeat(3)}${"more words ".repeat(20)}`;
    const s = aboutSnippet([long]);
    expect(s.length).toBeLessThanOrEqual(160);
    expect(s.endsWith(".")).toBe(true);
    expect(aboutSnippet(ABOUT_DEFAULT).length).toBeLessThanOrEqual(160);
  });
});
