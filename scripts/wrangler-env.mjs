// Prints `export NAME='value'` lines for one environment's vars in wrangler.jsonc, for the deploy script to build with.
// They're all public (URLs, the publishable key, model names). Secrets never go in wrangler.jsonc.
import { readFileSync } from "node:fs";

const target = process.argv[2];
// JSONC to JSON: drop // and /* */ comments outside strings, then trailing commas.
function parseJsonc(text) {
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

const config = parseJsonc(readFileSync("wrangler.jsonc", "utf8"));
const vars = config.env?.[target]?.vars;
if (!target || !vars) {
  console.error(`No vars for environment "${target}" in wrangler.jsonc. Known: ${Object.keys(config.env ?? {}).join(", ") || "none"}`);
  process.exit(1);
}
const quote = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;
for (const [k, v] of Object.entries(vars)) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(k)) { console.error(`Odd var name: ${k}`); process.exit(1); }
  console.log(`export ${k}=${quote(v)}`);
}
