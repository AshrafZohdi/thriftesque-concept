#!/usr/bin/env bash
# Writes the app's local env file for the LOCAL Supabase stack from `supabase status`: the URL and the publishable key only.
# The secret key is never written there: OpenNext bakes every variable from the project's env files into the Worker
# bundle (D-038). The seed asks `supabase status` for the secret key itself.
set -euo pipefail
cd "$(dirname "$0")/.."
file=".env.local"

status="$(npx supabase status -o env 2>/dev/null)" || { echo "Local Supabase isn't running. Start it with: npx supabase start" >&2; exit 1; }
get() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p"; }

url="$(get API_URL)"
publishable="$(get PUBLISHABLE_KEY)"
[[ -n "$url" && -n "$publishable" ]] || { echo "Couldn't read the URL and publishable key from supabase status." >&2; exit 1; }

# Keep other lines (for example GEMINI_API_KEY); drop old Supabase lines, including any secret key from earlier versions.
kept=""
[[ -f "$file" ]] && kept="$(grep -Ev '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' "$file" || true)"

umask 077
{
  printf 'NEXT_PUBLIC_SUPABASE_URL=%s\n' "$url"
  printf 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$publishable"
  [[ -n "$kept" ]] && printf '%s\n' "$kept"
} > "$file"
echo "$file written for $url (no secret key)"
