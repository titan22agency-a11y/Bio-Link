"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BLOCK_LABELS, type Block, type BlockType, type PageContent, createBlock, newId } from "@/lib/blocks";
import { googleFontHref } from "@/lib/fonts";
import { PageRenderer } from "@/components/renderer/PageRenderer";
import { BlockForm } from "./BlockForm";
import { ThemePanel } from "./ThemePanel";
import { Text, Toggle } from "./fields";

export type EditorMeta = {
  id: string;
  slug: string;
  customDomain: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  noIndex: boolean;
  ownerName: string;
  ownerPlan: string;
  publicUrl: string;
  dirtySincePublish: boolean;
};

type Tab = "blocks" | "theme" | "settings";

export function Editor({ initialContent, initialMeta }: { initialContent: PageContent; initialMeta: EditorMeta }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [meta, setMeta] = useState(initialMeta);
  const [selected, setSelected] = useState<string | null>(initialContent.blocks[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>("blocks");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "publish" | "unpublish">("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const dragId = useRef<string | null>(null);

  const edit = useCallback((c: PageContent) => { setContent(c); setDirty(true); }, []);
  const editMeta = (patch: Partial<EditorMeta>) => { setMeta((m) => ({ ...m, ...patch })); setDirty(true); };

  const selectedBlock = content.blocks.find((b) => b.id === selected) ?? null;

  const updateBlock = (b: Block) => edit({ ...content, blocks: content.blocks.map((x) => (x.id === b.id ? b : x)) });
  const addBlock = (type: BlockType) => {
    const b = createBlock(type);
    const idx = selectedBlock ? content.blocks.indexOf(selectedBlock) + 1 : content.blocks.length;
    const blocks = [...content.blocks];
    blocks.splice(idx, 0, b);
    edit({ ...content, blocks });
    setSelected(b.id);
    setTab("blocks");
  };
  const move = (id: string, delta: number) => {
    const i = content.blocks.findIndex((b) => b.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= content.blocks.length) return;
    const blocks = [...content.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    edit({ ...content, blocks });
  };
  const moveTo = (id: string, targetId: string) => {
    if (id === targetId) return;
    const blocks = [...content.blocks];
    const from = blocks.findIndex((b) => b.id === id);
    const [b] = blocks.splice(from, 1);
    blocks.splice(blocks.findIndex((x) => x.id === targetId), 0, b);
    edit({ ...content, blocks });
  };
  const duplicate = (id: string) => {
    const i = content.blocks.findIndex((b) => b.id === id);
    const copy = { ...structuredClone(content.blocks[i]), id: newId() };
    const blocks = [...content.blocks];
    blocks.splice(i + 1, 0, copy);
    edit({ ...content, blocks });
    setSelected(copy.id);
  };
  const remove = (id: string) => {
    if (!confirm("Delete this block?")) return;
    edit({ ...content, blocks: content.blocks.filter((b) => b.id !== id) });
    if (selected === id) setSelected(null);
  };

  const save = useCallback(async (): Promise<boolean> => {
    setBusy("save");
    setMsg(null);
    const res = await fetch(`/api/admin/pages/${meta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: content,
        title: meta.title,
        slug: meta.slug,
        customDomain: meta.customDomain || null,
        seoTitle: meta.seoTitle || null,
        seoDescription: meta.seoDescription || null,
        ogImage: meta.ogImage || null,
        noIndex: meta.noIndex,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMsg({ kind: "err", text: json.error ?? "Save failed" });
      return false;
    }
    setWarnings(json.warnings ?? []);
    setDirty(false);
    setMeta((m) => ({ ...m, dirtySincePublish: m.status === "PUBLISHED" }));
    setMsg({ kind: "ok", text: "Draft saved" });
    return true;
  }, [content, meta]);

  async function publish() {
    if (dirty && !(await save())) return;
    setBusy("publish");
    const res = await fetch(`/api/admin/pages/${meta.id}/publish`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setMsg({ kind: "err", text: json.error ?? "Publish failed" });
    setMeta((m) => ({ ...m, status: "PUBLISHED", dirtySincePublish: false }));
    setMsg({ kind: "ok", text: "Published — live now" });
    router.refresh();
  }

  async function unpublish() {
    if (!confirm("Take this page offline? Visitors will see a 404.")) return;
    setBusy("unpublish");
    const res = await fetch(`/api/admin/pages/${meta.id}/publish`, { method: "DELETE" });
    setBusy("");
    if (!res.ok) return setMsg({ kind: "err", text: "Unpublish failed" });
    setMeta((m) => ({ ...m, status: "DRAFT" }));
    setMsg({ kind: "warn", text: "Page is offline" });
  }

  // Ctrl/Cmd+S saves; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [save, dirty]);

  const statusBadge = useMemo(() => {
    if (meta.status === "PUBLISHED" && (dirty || meta.dirtySincePublish)) return ["Unpublished changes", "bg-amber-100 text-amber-800"];
    if (meta.status === "PUBLISHED") return ["Live", "bg-emerald-100 text-emerald-800"];
    return ["Draft", "bg-stone-200 text-stone-700"];
  }, [meta.status, meta.dirtySincePublish, dirty]);

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      <link rel="stylesheet" href={googleFontHref(content.theme.font)} />
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <Link href="/admin/pages" className="text-sm text-stone-500 hover:text-stone-900">← Pages</Link>
        <div className="min-w-0">
          <div className="truncate font-semibold text-stone-900">{meta.title}</div>
          <div className="truncate text-xs text-stone-500">{meta.ownerName} · {meta.ownerPlan}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[1]}`}>{statusBadge[0]}</span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {msg && <span className={`text-sm ${msg.kind === "err" ? "text-red-600" : msg.kind === "warn" ? "text-amber-700" : "text-emerald-700"}`}>{msg.text}</span>}
          {meta.status === "PUBLISHED" && <a href={meta.publicUrl} target="_blank" rel="noreferrer" className="btn">View live ↗</a>}
          <Link href={`/admin/pages/${meta.id}/analytics`} className="btn">Analytics</Link>
          <button className="btn" onClick={save} disabled={!!busy || !dirty}>{busy === "save" ? "Saving…" : dirty ? "Save draft" : "Saved"}</button>
          {meta.status === "PUBLISHED" && <button className="btn-danger" onClick={unpublish} disabled={!!busy}>Unpublish</button>}
          <button className="btn-primary" onClick={publish} disabled={!!busy}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Plan limits ({meta.ownerPlan}): {warnings.join(" · ")}. Staff can still publish; self-service clients will be blocked.
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(320px,1fr)_420px]">
        {/* Block list */}
        <aside className="min-h-0 overflow-y-auto border-e border-stone-200 bg-stone-50 p-3">
          <div className="mb-3 flex gap-1 rounded-lg bg-stone-200 p-1 text-sm">
            {(["blocks", "theme", "settings"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-2 py-1 capitalize ${tab === t ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}>{t}</button>
            ))}
          </div>
          <ul className="space-y-1.5">
            {content.blocks.map((b, i) => (
              <li key={b.id}
                draggable
                onDragStart={() => { dragId.current = b.id; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId.current) moveTo(dragId.current, b.id); dragId.current = null; }}
                onClick={() => { setSelected(b.id); setTab("blocks"); }}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${selected === b.id && tab === "blocks" ? "border-stone-900 bg-white" : "border-stone-200 bg-white hover:border-stone-400"}`}>
                <span className="cursor-grab text-stone-400" title="Drag to reorder">⋮⋮</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-stone-800">{BLOCK_LABELS[b.type]}</span>
                  <span className="block truncate text-xs text-stone-500">{summary(b)}</span>
                </span>
                <span className="hidden gap-0.5 group-hover:flex">
                  <IconBtn label="Up" disabled={i === 0} onClick={() => move(b.id, -1)}>↑</IconBtn>
                  <IconBtn label="Down" disabled={i === content.blocks.length - 1} onClick={() => move(b.id, 1)}>↓</IconBtn>
                  <IconBtn label="Duplicate" onClick={() => duplicate(b.id)}>⧉</IconBtn>
                  <IconBtn label="Delete" onClick={() => remove(b.id)}>✕</IconBtn>
                </span>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="btn w-full cursor-pointer list-none">+ Add block</summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                <button key={t} className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs hover:border-stone-500" onClick={() => addBlock(t)}>
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </details>
        </aside>

        {/* Inspector */}
        <section className="min-h-0 overflow-y-auto bg-white p-5">
          {tab === "blocks" && (selectedBlock ? (
            <>
              <h2 className="mb-4 text-lg font-semibold">{BLOCK_LABELS[selectedBlock.type]}</h2>
              <BlockForm block={selectedBlock} onChange={updateBlock} />
            </>
          ) : <p className="text-sm text-stone-500">Select a block on the left, or add a new one.</p>)}
          {tab === "theme" && <ThemePanel content={content} onChange={edit} />}
          {tab === "settings" && (
            <div className="space-y-4">
              <Text label="Internal title" value={meta.title} onChange={(v) => editMeta({ title: v })} />
              <Text label="Slug" dir="ltr" value={meta.slug} onChange={(v) => editMeta({ slug: v.toLowerCase() })}
                hint={`Served at /${meta.slug} and ${meta.slug}.<root domain>`} />
              <Text label="Custom domain (optional)" dir="ltr" value={meta.customDomain} placeholder="links.clientbrand.com"
                onChange={(v) => editMeta({ customDomain: v.toLowerCase() })}
                hint="Client adds a CNAME to our server; then issue SSL (see deploy/README)." />
              <hr />
              <Text label="SEO title" value={meta.seoTitle} onChange={(v) => editMeta({ seoTitle: v })} hint="Defaults to the profile name" />
              <Text label="SEO description" multiline value={meta.seoDescription} onChange={(v) => editMeta({ seoDescription: v })} />
              <Text label="Social share image URL" dir="ltr" value={meta.ogImage} onChange={(v) => editMeta({ ogImage: v })} hint="1200×630 recommended. Defaults to avatar." />
              <Toggle label="Hide from search engines (noindex)" checked={meta.noIndex} onChange={(v) => editMeta({ noIndex: v })} />
            </div>
          )}
        </section>

        {/* Live preview */}
        <section className="hidden min-h-0 items-start justify-center overflow-y-auto bg-stone-100 p-6 lg:flex">
          <div className="sticky top-0 h-[760px] w-[375px] overflow-hidden rounded-[2.5rem] border-[10px] border-stone-900 bg-white shadow-xl">
            <div className="h-full overflow-y-auto">
              <PageRenderer content={content} preview />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="h-6 w-6 rounded text-xs text-stone-500 hover:bg-stone-200 hover:text-stone-900 disabled:opacity-30">
      {children}
    </button>
  );
}

function summary(b: Block): string {
  switch (b.type) {
    case "profile": return b.name || "—";
    case "heading": case "text": return b.text || "—";
    case "button": return b.label || b.url || "—";
    case "social": return b.items.map((i) => i.platform).join(", ") || "No links yet";
    case "video": return b.url || "—";
    case "image": return b.alt || b.src || "—";
    case "contact": return b.title;
    case "spacer": return b.line ? "Divider" : `Space ${b.size}`;
  }
}
