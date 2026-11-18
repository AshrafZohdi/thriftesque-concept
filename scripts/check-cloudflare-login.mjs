// Stops a deploy before it builds when Wrangler's login can't reach the target's Cloudflare account (D-065). The Wrangler
// login is shared by every project on the machine, so working on another one can switch it; twice that made a deploy fail
// halfway (2026-11-16, 2026-11-18).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseJsonc } from "./wrangler-config.mjs";

const target = process.argv[2];
const config = parseJsonc(readFileSync("wrangler.jsonc", "utf8"));
const account = config.env?.[target]?.account_id ?? config.account_id;
if (!account) {
  console.log("cloudflare login: no account_id in wrangler.jsonc, not checked");
  process.exit(0);
}
let out = "";
try {
  out = execFileSync("npx", ["wrangler", "whoami"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  out = String(e.stdout ?? "");
}
if (!out.includes(account)) {
  const email = out.match(/associated with the email (\S+?)\.?$/m)?.[1];
  console.error(`cloudflare login: ${email ? `signed in as ${email}, which` : "the current Wrangler login"} can't reach account ${account}.`);
  console.error("Sign in with the login that has the client's Cloudflare account, then deploy again:");
  console.error("  npx wrangler logout && npx wrangler login");
  process.exit(1);
}
console.log(`cloudflare login: ok (can reach ${account})`);
