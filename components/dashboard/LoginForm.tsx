"use client";
// Team sign-in: email and password, accounts created by Nuvai (D-013). Public signups are off.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ChromeHeart } from "@/components/Chrome";
import s from "@/components/shop/shop.module.css";
import { browserDb } from "@/lib/supabase/browser";
import d from "./dashboard.module.css";

export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error: err } = await browserDb().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (err) {
      setError(err.code === "invalid_credentials" ? "Email or password is wrong." : "Couldn't sign in. Check your connection and try again.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <main className={d.loginWrap}>
      <form className={d.card} onSubmit={submit} noValidate>
        <ChromeHeart className="w-12" />
        <h1 className="display">Team sign in</h1>
        <p className={d.muted}>For the Thriftesque team. Ask Nuvai if you need an account.</p>
        <div className={d.field}>
          <label htmlFor={emailId}>Email</label>
          <input id={emailId} name="email" type="email" autoComplete="username" required />
        </div>
        <div className={d.field}>
          <label htmlFor={passId}>Password</label>
          <input id={passId} name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p className={d.error} role="alert">{error}</p>}
        <button className={`${s.btn} ${s.primary}`} type="submit" disabled={busy}>{busy ? "Signing in" : "Sign in"}</button>
        <Link className="mono" href="/">← Back to the shop</Link>
      </form>
    </main>
  );
}
