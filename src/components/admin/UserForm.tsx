"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Create a client (no login in Phase 1) or a staff member (admins only). */
export function UserForm({ role }: { role: "CLIENT" | "STAFF" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    Object.keys(data).forEach((k) => { if (!data[k]) delete data[k]; });
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, role: role === "CLIENT" ? "CLIENT" : data.role }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 md:grid-cols-6">
      <input name="name" required placeholder="Name" className="input md:col-span-2" />
      <input name="email" type="email" required placeholder="Email" className="input md:col-span-2" />
      {role === "CLIENT" ? (
        <>
          <input name="phone" placeholder="Phone" className="input" />
          <select name="plan" className="input"><option>FREE</option><option>PRO</option><option>BUSINESS</option></select>
          <input name="company" placeholder="Company" className="input md:col-span-4" />
        </>
      ) : (
        <>
          <select name="role" className="input"><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option></select>
          <input name="password" type="password" required minLength={10} placeholder="Temp password (10+)" className="input" />
        </>
      )}
      <button className="btn-primary md:col-span-2" disabled={busy}>{busy ? "Adding…" : role === "CLIENT" ? "Add client" : "Add staff"}</button>
      {error && <p className="text-sm text-red-600 md:col-span-6">{error}</p>}
    </form>
  );
}

export function PlanSelect({ userId, plan }: { userId: string; plan: string }) {
  const router = useRouter();
  return (
    <select className="input w-28 py-1" defaultValue={plan}
      onChange={async (e) => {
        await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: e.target.value }) });
        router.refresh();
      }}>
      <option>FREE</option><option>PRO</option><option>BUSINESS</option>
    </select>
  );
}

export function DeleteUser({ userId, label }: { userId: string; label: string }) {
  const router = useRouter();
  return (
    <button className="text-xs text-red-600 hover:underline"
      onClick={async () => {
        if (!confirm(`Delete ${label}? Their pages are deleted too. This cannot be undone.`)) return;
        const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
        if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Failed");
        router.refresh();
      }}>
      Delete
    </button>
  );
}
