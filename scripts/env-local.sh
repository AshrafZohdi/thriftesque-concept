#!/usr/bin/env bash
# Writes .env.local for the LOCAL Supabase stack from `supabase status`. Keys go straight to the file, never to the terminal.
set -euo pipefail
cd "$(dirname "$0")/.."

status="$(npx supabase status -o env 2>/dev/null)" || { echo "Local Supabase isn't running. Start it with: npx supabase start" >&2; exit 1; }
get() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p"; }

url="$(get API_URL)"
publishable="$(get PUBLISHABLE_KEY)"
secret="$(get SECRET_KEY)"
[[ -n "$url" && -n "$publishable" && -n "$secret" ]] || { echo "Couldn't read URL and keys from supabase status." >&2; exit 1; }

# Keep any non-Supabase lines (for example GEMINI_API_KEY) that are already in .env.local.
kept=""
[[ -f .env.local ]] && kept="$(grep -Ev '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' .env.local || true)"

umask 077
{
  printf 'NEXT_PUBLIC_SUPABASE_URL=%s\n' "$url"
  printf 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$publishable"
  printf 'SUPABASE_SECRET_KEY=%s\n' "$secret"
  [[ -n "$kept" ]] && printf '%s\n' "$kept"
} > .env.local
echo ".env.local written for $url"
