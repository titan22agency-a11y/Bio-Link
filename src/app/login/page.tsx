"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") === "forbidden" ? "This account has no dashboard access." : "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirect: false });
    setBusy(false);
    if (res?.error) return setError("Wrong email or password.");
    router.push(params.get("callbackUrl") || "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Sign in</h1>
      <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="block"><span className="label">Password</span><input name="password" type="password" required autoComplete="current-password" className="input" /></label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
