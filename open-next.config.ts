import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// KV keeps the client's Cloudflare account card-free (D-005). On-demand revalidation only, so no queue.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: d1NextTagCache,
});
