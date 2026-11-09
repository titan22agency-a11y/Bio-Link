"use client";

import { useRef, useState } from "react";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

export function Text({ label, value, onChange, placeholder, multiline, dir, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; dir?: "ltr" | "rtl" | "auto"; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <textarea className="input min-h-[96px]" value={value} dir={dir ?? "auto"} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} dir={dir ?? "auto"} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly (T | { value: T; label: string })[];
}) {
  return (
    <Field label={label}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
      <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input type="color" className="h-9 w-11 cursor-pointer rounded border border-stone-300 bg-white p-0.5" value={hex} onChange={(e) => onChange(e.target.value)} />
        <input className="input font-mono" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" dir="ltr" />
      </div>
    </Field>
  );
}

/** URL field with an upload button that stores the file on our server. */
export function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(json.error ?? "Upload failed");
    onChange(json.url);
  }

  return (
    <Field label={label}>
      <div className="flex gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-9 w-9 shrink-0 rounded border border-stone-200 object-cover" />
        )}
        <input className="input" value={value} dir="ltr" placeholder="https://… or upload" onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn shrink-0" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? "…" : "Upload"}
        </button>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
      {err && <span className="mt-1 block text-xs text-red-600">{err}</span>}
    </Field>
  );
}
