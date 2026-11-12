// Fails if a raw hex colour appears outside the token file. Mark a deliberate exception with "token-ok" on the same line.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib"];
const ALLOWED = new Set(["app/globals.css"]);
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function* files(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|css|mjs)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

const hits = [];
for (const root of ROOTS)
  for (const file of files(root)) {
    if (ALLOWED.has(file)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (HEX.test(line) && !line.includes("token-ok")) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }

if (hits.length) {
  console.error("Raw colours found. Use a token from app/globals.css:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("tokens: ok");
