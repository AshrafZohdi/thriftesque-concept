#!/usr/bin/env bash
# Deploy one commit to a Cloudflare environment from wrangler.jsonc, smoke it, and roll back if the smoke fails.
#   npm run deploy -- <environment> [--skip-gate]
# The build runs in a clean copy of the commit, so nothing from this folder's local env files (local Supabase, the Gemini
# key) can end up in the Worker (D-038). Public config comes from wrangler.jsonc; secrets are set separately (runbook).
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:?usage: npm run deploy -- <environment> [--skip-gate]}"
skip_gate=0
[[ "${2:-}" == "--skip-gate" ]] && skip_gate=1

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash your changes first: a deploy is always exactly one commit." >&2
  exit 1
fi
sha="$(git rev-parse --short HEAD)"
exports="$(node scripts/wrangler-env.mjs "$target")"
eval "$exports"
site="${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL missing from env.$target.vars}"

step() { printf '\n== %s\n' "$1"; }

if ((skip_gate)); then
  echo "Skipping the gate (--skip-gate). Only for a commit that already passed it."
else
  step "gate"
  npm run gate
fi

step "clean build of $sha for $target"
work="$(mktemp -d)"
cleanup() { git worktree remove --force "$work/app" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT
git worktree add --detach --quiet "$work/app" HEAD
cd "$work/app"
# A fresh install from the lockfile (Turbopack won't build with a node_modules linked from outside the project).
npm ci --no-audit --no-fund
npx opennextjs-cloudflare build
node scripts/check-worker-size.mjs
node scripts/check-build-secrets.mjs --deploy

step "rollback target"
# No live version yet (first deploy) is fine, so wrangler's error doesn't stop the script here.
version_now() { { npx wrangler deployments status --env "$target" --json 2>/dev/null || true; } | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try { const v = JSON.parse(s).versions ?? []; console.log(v.length === 1 && v[0].percentage === 100 ? v[0].version_id : ""); } catch { console.log(""); }
  });'; }
previous="$(version_now)"
echo "live before this deploy: ${previous:-none (first deploy)}"

step "deploy"
# OpenNext only forwards positional arguments to wrangler, so the commit is recorded in this output, not as a version tag.
npx opennextjs-cloudflare deploy --env "$target"
current="$(version_now)"
echo "live now: $current (commit $sha)"

step "smoke $site"
# Wait until the new version answers, then smoke it.
for _ in $(seq 1 30); do
  served="$(curl -s -o /dev/null -D - --max-time 10 "$site/robots.txt" | tr -d '\r' | grep -i '^x-worker-version:' | cut -d' ' -f2 || true)"
  [[ "$served" == "$current" ]] && break
  sleep 2
done
echo "serving: ${served:-unknown}"
if [[ "$served" == "$current" ]] && bash scripts/smoke.sh "$site"; then
  printf '\ndeployed %s to %s as version %s\n' "$sha" "$target" "$current"
  [[ -n "$previous" ]] && echo "roll back with: npx wrangler rollback $previous --env $target -m \"<reason>\""
  exit 0
fi

echo "Smoke failed on the new version." >&2
if [[ -n "$previous" ]]; then
  step "rolling back to $previous"
  npx wrangler rollback "$previous" --env "$target" -m "smoke failed for $sha" -y
  sleep 5
  bash scripts/smoke.sh "$site" || echo "Smoke still fails after the rollback. Investigate now." >&2
fi
exit 1
