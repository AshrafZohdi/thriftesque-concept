// One public address: https://thriftesque.com. www and plain http answer too, but only to redirect there, so links,
// shares and search results all use the same address. Local addresses are left alone so the preview keeps working.
// Returns the address to redirect to, or null to serve the request.
export function canonicalRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || url.hostname.endsWith(".localhost");
  if (local) return null;
  const www = url.hostname.startsWith("www.");
  if (!www && url.protocol === "https:") return null;
  if (www) url.hostname = url.hostname.slice(4);
  url.protocol = "https:";
  return url.toString();
}
