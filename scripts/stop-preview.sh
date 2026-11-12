#!/usr/bin/env bash
# Stops this project's Workers preview: parents first (they restart workerd otherwise), only processes under this repo's path.
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
pats=("$root/node_modules/.bin/opennextjs-cloudflare preview" "$root/node_modules/.bin/wrangler dev" "$root/node_modules/wrangler/" "$root/node_modules/@cloudflare/workerd")
for p in "${pats[@]}"; do pkill -f "$p" 2>/dev/null; done
sleep 2
for p in "${pats[@]}"; do pkill -9 -f "$p" 2>/dev/null; done
left=$(for p in "${pats[@]}"; do pgrep -f "$p"; done | wc -l | tr -d ' ')
echo "preview stopped (${left} processes left)"
