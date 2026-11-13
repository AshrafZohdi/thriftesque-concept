// Reads wrangler.jsonc (JSONC: comments and trailing commas allowed) for the deploy and preview scripts.
import { readFileSync } from "node:fs";

// JSONC to JSON: drop // and /* */ comments outside strings, then trailing commas.
export function parseJsonc(text) {
  let out = "", inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") out += text[++i];
      else if (c === '"') inStr = false;
    } else if (c === '"') { inStr = true; out += c; }
    else if (c === "/" && n === "/") { while (i < text.length && text[i] !== "\n") i++; out += "\n"; }
    else if (c === "/" && n === "*") { i = text.indexOf("*/", i + 2) + 1; }
    else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}


// Public vars of one deploy target, or null if the target doesn't exist.
export function targetVars(target) {
  const config = parseJsonc(readFileSync("wrangler.jsonc", "utf8"));
  return { vars: config.env?.[target]?.vars ?? null, known: Object.keys(config.env ?? {}) };
}
