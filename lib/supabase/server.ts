// Server Supabase client for server actions only. Actions can write cookies, so a token refresh here is saved safely;
// server components never refresh tokens (D-020).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function actionDb() {
  const store = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) store.set(name, value, options);
      },
    },
  });
}

// Every write checks both: signed in, and on the team (D-023). RLS checks again in the database.
export async function requireTeam() {
  const db = await actionDb();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { db, ok: false as const, error: "You're signed out. Sign in again." };
  const team = await db.rpc("is_team");
  if (team.error || team.data !== true) return { db, ok: false as const, error: "This account isn't on the team." };
  return { db, ok: true as const, user: data.user };
}
