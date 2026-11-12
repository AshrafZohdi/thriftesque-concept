// Read-only Supabase client for shop pages. Uses the publishable key, so RLS decides what comes back (hidden products never do).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { PHOTO } from "@/lib/photo-spec";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function publicDb() {
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Photos are served as-is from the public bucket (D-011): no image optimisation, no signed URLs.
export function photoUrl(path: string): string {
  return `${url}/storage/v1/object/public/${PHOTO.bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
