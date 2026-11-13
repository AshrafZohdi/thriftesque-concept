// Daily keep-alive (D-015): one tiny read so the free Supabase project never has 7 idle days and pauses.
// Runs from the Worker's cron. Throws on failure so the cron run shows as failed in Cloudflare's logs.
export async function keepAlive(url: string | undefined, key: string | undefined, fetchFn: typeof fetch = fetch): Promise<void> {
  if (!url || !key) throw new Error("keep-alive: the Supabase URL or publishable key is missing");
  const res = await fetchFn(`${url}/rest/v1/settings?select=id&limit=1`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`keep-alive: Supabase answered ${res.status}`);
  console.log("keep-alive: ok");
}
