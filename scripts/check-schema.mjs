// Refuses to deploy code that's newer than the target database (D-052): the newest file in supabase/migrations must already be
// applied there, as reported by public.schema_version(). Push migrations first: npx supabase db push
import { readdirSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("check-schema: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (the deploy sets them).");
  process.exit(1);
}
const newest = readdirSync("supabase/migrations").filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort().at(-1).slice(0, 14);
const res = await fetch(`${url}/rest/v1/rpc/schema_version`, { method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: "{}" });
const live = res.ok ? await res.json() : null;
if (typeof live !== "string" || live < newest) {
  console.error(`check-schema: the database is behind the code (database: ${live ?? "unknown"}, code needs: ${newest}).`);
  console.error("Push the migrations first: npx supabase db push");
  process.exit(1);
}
console.log(`schema: ok (${live})`);
