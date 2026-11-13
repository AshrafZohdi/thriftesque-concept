// Prints `export NAME='value'` lines for one environment's vars in wrangler.jsonc, for the deploy script to build with.
// They're all public (URLs, the publishable key, model names). Secrets never go in wrangler.jsonc.
import { targetVars } from "./wrangler-config.mjs";

const target = process.argv[2];
const { vars, known } = targetVars(target);
if (!target || !vars) {
  console.error(`No vars for environment "${target}" in wrangler.jsonc. Known: ${known.join(", ") || "none"}`);
  process.exit(1);
}
const quote = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;
for (const [k, v] of Object.entries(vars)) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(k)) { console.error(`Odd var name: ${k}`); process.exit(1); }
  console.log(`export ${k}=${quote(v)}`);
}
