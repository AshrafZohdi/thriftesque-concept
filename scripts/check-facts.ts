// Refuses to continue while any shop fact is unconfirmed (lib/shop-facts.ts). The deploy runs it whenever preview mode is
// off, so the live shop can't launch with "To be confirmed" on its terms or privacy page.
import { unconfirmedFacts } from "../lib/shop-facts.ts";

const open = unconfirmedFacts();
if (open.length) {
  console.error(`Not ready to leave preview mode. Unconfirmed shop facts (lib/shop-facts.ts):`);
  for (const [name, f] of open) console.error(`  - ${name}: ${f.ref}`);
  process.exit(1);
}
console.log("shop facts: all confirmed");
