// Fails if the built Worker carries a secret that must never be there (D-038). OpenNext copies every variable from the
// project's env files into .open-next/cloudflare/next-env.mjs, which is bundled into the Worker. Prints secret names only.
// With --deploy (run by scripts/deploy.sh) it also checks the build points at the live https site and Supabase project.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

// A deploy build must point at the real site and the real Supabase project. These are public values, so they're printed.
// The deploy script exports them from wrangler.jsonc; values baked from env files count too.
if (forDeploy) {
  const { production = {} } = await import(`${process.cwd()}/${file}`);
  const value = (name) => process.env[name] || production[name] || "";
  const bad = [];
  for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
    let ok = false;
    try {
      const u = new URL(value(name));
      ok = u.protocol === "https:" && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname);
    } catch {}
    console.log(`${name}=${value(name) || "(not set)"}${ok ? "" : "  <- must be the live https address"}`);
    if (!ok) bad.push(name);
  }
  if (!value("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY").startsWith("sb_publishable_")) bad.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  // Next inlines NEXT_PUBLIC_ values at build time, so the server bundle must contain the live Supabase URL and not the local one.
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(m?js)$/.test(name)) files.push(p);
    }
  };
  walk(".open-next/server-functions");
  const bundle = files.map((p) => readFileSync(p, "utf8"));
  if (value("NEXT_PUBLIC_SUPABASE_URL") && !bundle.some((t) => t.includes(value("NEXT_PUBLIC_SUPABASE_URL")))) bad.push("Supabase URL not in the bundle");
  if (bundle.some((t) => t.includes("127.0.0.1:55321"))) bad.push("the bundle still points at local Supabase");

  if (bad.length) {
    console.error(`Not a deploy build: ${bad.join(", ")}. Build with scripts/deploy.sh.`);
    process.exit(1);
  }
}
console.log(`build secrets: ok${forDeploy ? " (deploy check)" : ""}`);
