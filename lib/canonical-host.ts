// www.thriftesque.com answers too, but only to send people to thriftesque.com, so links and search results use one address.
// Returns the address to redirect to, or null to serve the request.
export function wwwRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  if (!url.hostname.startsWith("www.")) return null;
  url.hostname = url.hostname.slice(4);
  url.protocol = "https:";
  return url.toString();
}
