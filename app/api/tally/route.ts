// Shop stats (D-067): the shop's anonymous counts arrive here and go to the database through record_event, which hashes the
// visitor with a daily salt. Called with navigator.sendBeacon from lib/tally.ts; always answers 204.
import { handleTally } from "@/lib/stats";
import { shopStats } from "@/lib/site";
import { publicDb } from "@/lib/supabase/public";

export async function POST(req: Request) {
  return handleTally(req, {
    enabled: shopStats,
    record: async (e, fingerprint) => {
      const { error } = await publicDb().rpc("record_event", { p_name: e.name, p_path: e.path, p_props: e.props, p_fingerprint: fingerprint });
      if (error) console.error(`tally: ${error.message}`);
    },
  });
}
