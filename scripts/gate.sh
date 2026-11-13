#!/usr/bin/env bash
# Ship gate (docs/11-qa-plan.md). Every step must pass; nothing is piped, so a failure stops the run.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n== %s\n' "$1"; }

# The gate always runs against the local stack. Shell variables would override the local env file and point the build at
# another database (found 2026-11-13: a deploy exported production values before running the gate).
for v in $(compgen -e | grep -E '^(NEXT_PUBLIC_|GEMINI_)' || true); do
  echo "ignoring $v from the shell"
  unset "$v"
done

step "audit (production deps, high and above)"
npm audit --omit=dev --audit-level=high

step "typecheck"
npx next typegen && npx tsc --noEmit

step "lint"
npx eslint .
node scripts/check-tokens.mjs

step "unit"
npx vitest run

step "local database (the build prerenders from it, e2e reads it)"
npx supabase status >/dev/null 2>&1 || { echo "Local Supabase isn't running. Start it with: npx supabase start, then npm run seed" >&2; exit 1; }
npx supabase test db
npm run seed

step "workers build"
npx opennextjs-cloudflare build

step "worker size"
node scripts/check-worker-size.mjs

step "no secrets in the Worker bundle (D-038)"
node scripts/check-build-secrets.mjs

step "e2e on the workerd preview"
npx playwright test

printf '\ngate: all green\n'
