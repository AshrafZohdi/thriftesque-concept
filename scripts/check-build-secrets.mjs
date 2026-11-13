// Fails if the built Worker carries a secret that must never be there (D-038). OpenNext copies every variable from the
// project's env files into .open-next/cloudflare/next-env.mjs, which is bundled into the Worker. Prints names only.
import { existsSync, readFileSync } from "node:fs";

const file = ".open-next/cloudflare/next-env.mjs";
if (!existsSync(file)) {
  console.error(`${file} not found. Run the Workers build first.`);
  process.exit(1);
}
const built = readFileSync(file, "utf8");

// Never allowed: the Supabase secret key bypasses every RLS rule.
const never = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
// Allowed in a local preview only. Production gets it as a Worker secret (runbook), so a deploy build must not carry it.
const deployOnly = ["GEMINI_API_KEY"];
const forDeploy = process.argv.includes("--deploy");

const found = [...never, ...(forDeploy ? deployOnly : [])].filter((name) => built.includes(`"${name}"`));
if (found.length) {
  console.error(`Secrets baked into the Worker bundle: ${found.join(", ")}. Remove them from the project's env files and rebuild.`);
  process.exit(1);
}
console.log(`build secrets: ok${forDeploy ? " (deploy check)" : ""}`);
