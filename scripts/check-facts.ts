// Refuses to continue while any shop detail is empty on the target's database (D-046, D-048). The deploy runs it whenever
// preview mode is off, so the live shop can't launch with "To be confirmed" on its terms or privacy page.
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
  console.error("Not ready to leave preview mode. Fill these in on the dashboard (Shop settings > Terms and privacy details):");
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}
console.log("shop details: all filled in");
