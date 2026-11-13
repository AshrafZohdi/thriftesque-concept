#!/usr/bin/env bash
# Read-only smoke test for a running shop: npm run smoke -- https://example.com (default: the local preview).
# Only GETs and requests the server must refuse. It never signs in, saves, orders or calls the AI.
set -euo pipefail
base="${1:-http://localhost:8787}"
base="${base%/}"
fails=0
ok() { printf '  ok   %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; fails=$((fails + 1)); }
status() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }
expect() { local want="$1" label="$2"; shift 2; local got; got="$(status "$@")"; [[ "$got" == "$want" ]] && ok "$label ($got)" || bad "$label: expected $want, got $got"; }

echo "smoke: $base"
expect 200 "home" "$base/"
expect 200 "sign-in page" "$base/login"
expect 200 "robots.txt" "$base/robots.txt"
expect 200 "sitemap.xml" "$base/sitemap.xml"
expect 200 "terms" "$base/terms"
expect 200 "privacy" "$base/privacy"
expect 200 "web manifest" "$base/manifest.webmanifest"
expect 200 "share card image" "$base/og.jpg"
expect 404 "unknown product" "$base/p/TQ-0000"
expect 404 "malformed product code" "$base/p/not-a-code"
expect 404 "unknown page" "$base/no-such-page"

sitemap="$(curl -s --max-time 20 "$base/sitemap.xml")"
code="$(printf '%s' "$sitemap" | grep -o '/p/TQ-[0-9]*' | head -1 | cut -d/ -f3 || true)"
if [[ -n "$code" ]]; then
  expect 200 "product page $code (first in the sitemap)" "$base/p/$code"
  page="$(curl -s --max-time 20 "$base/p/$code")"
  grep -q 'property="og:image"' <<<"$page" && ok "product page has an og:image for link previews" || bad "product page has no og:image"
else
  # A shop with nothing for sale yet is valid (first deploy, or everything sold), so this is a note, not a failure.
  echo "  info the sitemap lists no products, so product pages weren't checked"
fi
grep -q "Sitemap: " <<<"$(curl -s --max-time 20 "$base/robots.txt")" && ok "robots.txt points to the sitemap" || bad "robots.txt has no Sitemap line"
home="$(curl -s --max-time 20 "$base/")"
grep -q 'application/ld+json' <<<"$home" && ok "home has structured data" || bad "home has no structured data"
grep -q 'href="/privacy"' <<<"$home" && grep -q 'href="/terms"' <<<"$home" && ok "footer links to terms and privacy" || bad "footer is missing terms or privacy"

headers="$(curl -s -D - -o /dev/null --max-time 20 "$base/" | tr -d '\r')"
for h in content-security-policy strict-transport-security x-content-type-options referrer-policy permissions-policy x-frame-options cross-origin-opener-policy; do
  grep -qi "^$h:" <<<"$headers" && ok "header $h" || bad "missing header $h"
done
grep -qi "^x-powered-by:" <<<"$headers" && bad "x-powered-by is exposed" || ok "no x-powered-by"
version="$(grep -i '^x-worker-version:' <<<"$headers" | cut -d' ' -f2 || true)"
echo "  info Worker version: ${version:-not reported (local preview)}"

# On the real domain, www must send people to the bare domain (lib/canonical-host.ts).
host="${base#*://}"
if [[ "$host" != www.* && "$host" != localhost* && "$host" != 127.* && "$host" != *.workers.dev ]]; then
  loc="$(curl -s -o /dev/null -D - --max-time 20 "https://www.$host/p/TQ-0000?x=1" | tr -d '\r' | grep -i '^location:' | cut -d' ' -f2 || true)"
  [[ "$loc" == "https://$host/p/TQ-0000?x=1" ]] && ok "www redirects to $host" || bad "www.$host doesn't redirect to $host (got: ${loc:-nothing})"
  loc="$(curl -s -o /dev/null -D - --max-time 20 "http://$host/p/TQ-0000?x=1" | tr -d '\r' | grep -i '^location:' | cut -d' ' -f2 || true)"
  [[ "$loc" == "https://$host/p/TQ-0000?x=1" ]] && ok "http redirects to https" || bad "http://$host doesn't redirect to https (got: ${loc:-nothing})"
fi

# The AI route must refuse anyone who isn't a signed-in team member, before doing anything.
expect 405 "autofill refuses GET" "$base/api/autofill"
expect 403 "autofill refuses another origin" -X POST -H "origin: https://example.org" -H "content-type: application/json" -d '{"path":"p/x.webp"}' "$base/api/autofill"
expect 401 "autofill refuses a signed-out caller" -X POST -H "origin: $base" -H "content-type: application/json" -d '{"path":"p/00000000-0000-0000-0000-000000000000.webp"}' "$base/api/autofill"

if ((fails)); then echo "smoke: $fails failed"; exit 1; fi
echo "smoke: all ok"
