#!/usr/bin/env bash
# Backs up the production database and product photos to backups/<date>/ on this machine (D-047). The free Supabase plan
# has no downloadable backups, so run this weekly and after big catalogue changes: npm run backup
# Needs the CLI linked to production (npx supabase link --project-ref pexllnnfemgdutonpdqw); it asks for the database
# password. Backups hold team sign-in records, so keep them private: backups/ is git-ignored. Copy them somewhere safe.
set -euo pipefail
cd "$(dirname "$0")/.."
ref="$(cat supabase/.temp/project-ref 2>/dev/null || true)"
[[ -n "$ref" ]] || { echo "Not linked to a Supabase project. Run: npx supabase link --project-ref pexllnnfemgdutonpdqw" >&2; exit 1; }
dir="backups/$(date +%Y-%m-%d)"
mkdir -p "$dir"
echo "backing up project $ref to $dir"
npx supabase db dump --linked -f "$dir/schema.sql"
npx supabase db dump --linked --data-only --use-copy -s public,auth,storage -f "$dir/data.sql"
npx supabase storage cp -r ss:///product-photos "$dir/photos" --experimental --linked
echo "done: $(du -sh "$dir" | cut -f1) in $dir"
