"use client";

import { useState } from "react";
import type { BlockOf } from "@/lib/blocks";

type Props = {
  block: BlockOf<"contact">;
  pageId?: string;
  preview?: boolean;
  rtl: boolean;
  buttonStyle: React.CSSProperties;
  buttonClass: string;
};

export function ContactForm({ block, pageId, preview, rtl, buttonStyle, buttonClass }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview || !pageId) return;
    setState("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, pageId, blockId: block.id }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") return <p className="rounded-xl bg-black/5 p-4 text-center">{block.successMessage}</p>;

  const field = "w-full rounded-lg border border-black/10 bg-white/90 px-3 py-2.5 text-[15px] text-stone-900 outline-none focus:ring-2 focus:ring-black/20";
  const t = rtl
    ? { name: "الاسم", email: "البريد الإلكتروني", phone: "رقم الهاتف", msg: "رسالتك", err: "حدث خطأ، حاول مرة أخرى." }
    : { name: "Name", email: "Email", phone: "Phone", msg: "Message", err: "Something went wrong. Please try again." };

  return (
    <form onSubmit={onSubmit} className="space-y-2.5 rounded-2xl bg-black/5 p-4">
      {block.title && <h3 className="mb-1 text-center text-lg font-semibold">{block.title}</h3>}
      <input name="name" required maxLength={120} placeholder={t.name} className={field} />
      <input name="email" type="email" required maxLength={200} placeholder={t.email} className={field} dir="ltr" />
      {block.askPhone && <input name="phone" type="tel" maxLength={40} placeholder={t.phone} className={field} dir="ltr" />}
      <textarea name="message" required maxLength={3000} rows={4} placeholder={t.msg} className={field} />
      {/* Honeypot: bots fill it, humans never see it. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button type="submit" disabled={state === "sending" || preview} className={buttonClass} style={buttonStyle}>
        {state === "sending" ? "…" : block.submitLabel}
      </button>
      {state === "error" && <p className="text-center text-sm text-red-600">{t.err}</p>}
    </form>
  );
}
