"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";

type Client = { id: string; name: string | null; email: string };

export function NewPageForm({ clients, defaultClient }: { clients: Client[]; defaultClient?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(clients.length && defaultClient !== "new" ? "existing" : "new");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerId, setOwnerId] = useState(defaultClient && defaultClient !== "new" ? defaultClient : clients[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, slug, lang,
        ...(mode === "existing" ? { ownerId } : { newClient: { name: clientName, email: clientEmail } }),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not create page");
    router.push(`/admin/pages/${json.page.id}`);
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="flex gap-1 rounded-lg bg-stone-100 p-1 text-sm">
        <button type="button" disabled={!clients.length} onClick={() => setMode("existing")} className={`flex-1 rounded-md py-1 ${mode === "existing" ? "bg-white shadow-sm" : ""}`}>Existing client</button>
        <button type="button" onClick={() => setMode("new")} className={`flex-1 rounded-md py-1 ${mode === "new" ? "bg-white shadow-sm" : ""}`}>New client</button>
      </div>
      {mode === "existing" ? (
        <label className="block"><span className="label">Client</span>
          <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.email} — {c.email}</option>)}
          </select>
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Client name</span><input className="input" value={clientName} required onChange={(e) => setClientName(e.target.value)} /></label>
          <label className="block"><span className="label">Client email</span><input className="input" type="email" value={clientEmail} required onChange={(e) => setClientEmail(e.target.value)} /></label>
        </div>
      )}
      <label className="block"><span className="label">Page title</span>
        <input className="input" value={title} required onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
      </label>
      <label className="block"><span className="label">Slug (URL)</span>
        <input className="input font-mono" dir="ltr" value={slug} required pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} />
        <span className="mt-1 block text-xs text-stone-400">yourdomain.com/{slug || "slug"} · {slug || "slug"}.yourdomain.com</span>
      </label>
      <label className="block"><span className="label">Starting language</span>
        <select className="input" value={lang} onChange={(e) => setLang(e.target.value as "en" | "ar")}>
          <option value="en">English (LTR)</option><option value="ar">العربية (RTL)</option>
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create & open builder"}</button>
    </form>
  );
}
