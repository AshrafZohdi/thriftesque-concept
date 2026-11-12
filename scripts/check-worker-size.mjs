// Bundles the built Worker without deploying and fails if the compressed size is over budget (free plan limit is 3 MiB).
import { spawnSync } from "node:child_process";

const BUDGET_KIB = 2.5 * 1024;

const run = spawnSync("npx", ["wrangler", "deploy", "--dry-run", "--outdir", ".wrangler/dry-run"], {
  encoding: "utf8",
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
});
const out = `${run.stdout}\n${run.stderr}`;
if (run.status !== 0) {
  console.error(out);
  process.exit(run.status ?? 1);
}

const m = /Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/.exec(out);
if (!m) {
  console.error("Couldn't find the upload size in wrangler's output:\n" + out);
  process.exit(1);
}
const [, raw, gzip] = m.map(Number);
console.log(`worker size: ${raw} KiB raw, ${gzip} KiB gzip (budget ${BUDGET_KIB} KiB gzip, limit 3072)`);
if (gzip > BUDGET_KIB) process.exit(1);
