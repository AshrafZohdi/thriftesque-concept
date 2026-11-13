// Lists shop details still empty on the target's database (D-048). Empty ones are left off the terms and privacy pages, so
// this is a reminder, not a blocker (D-050). The deploy runs it before every deploy, and it does fail if the details can't be
// read at all: that means the migration hasn't been pushed, and the new code would break the live site.
// Reads the public settings row with the publishable key the deploy exported (NEXT_PUBLIC_SUPABASE_URL and _KEY).
import { DETAIL_COLUMNS, detailsFromRow, missingDetails } from "../lib/shop-facts.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("check-facts: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (the deploy sets them).");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/settings?select=${DETAIL_COLUMNS}&id=eq.1`, { headers: { apikey: key } });
if (!res.ok) {
  console.error(`check-facts: couldn't read the shop details (${res.status}). Has the latest migration been pushed?`);
  process.exit(1);
}
const [row] = (await res.json()) as Parameters<typeof detailsFromRow>[0][];
const missing = missingDetails(detailsFromRow(row));
if (missing.length) {
  console.log("Note: these shop details are empty, so they're left off the terms and privacy pages. Fill them in on the dashboard");
  console.log("(Shop settings > Terms and privacy details):");
  for (const m of missing) console.log(`  - ${m}`);
  process.exit(0);
}
console.log("shop details: all filled in");
