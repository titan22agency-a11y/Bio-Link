"use client";

import { type Block, type BlockOf, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/blocks";
import { PLATFORM_LABELS } from "@/components/renderer/SocialIcon";
import { ColorField, ImageField, Select, Text, Toggle } from "./fields";

type Props<B extends Block = Block> = { block: B; onChange: (b: B) => void };

const ALIGN_OPTS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const;

/** Settings form for one block. Add a case here when adding a block type. */
export function BlockForm({ block, onChange }: Props) {
  // Field values are typed by each input; zod re-validates on save.
  const set = (k: string, v: unknown) => onChange({ ...block, [k]: v } as Block);

  switch (block.type) {
    case "profile":
      return (
        <div className="space-y-4">
          <ImageField label="Avatar" value={block.avatarUrl} onChange={(v) => set("avatarUrl", v)} />
          <Text label="Name" value={block.name} onChange={(v) => set("name", v)} />
          <Text label="Subtitle" value={block.subtitle} onChange={(v) => set("subtitle", v)} />
          <Select label="Avatar shape" value={block.avatarShape} onChange={(v) => set("avatarShape", v)} options={["circle", "rounded", "square"] as const} />
          <Toggle label="Verified badge" checked={block.verified} onChange={(v) => set("verified", v)} />
        </div>
      );
    case "heading":
      return (
        <div className="space-y-4">
          <Text label="Text" value={block.text} onChange={(v) => set("text", v)} />
          <Select label="Size" value={block.size} onChange={(v) => set("size", v)} options={["sm", "md", "lg"] as const} />
          <Select label="Align" value={block.align} onChange={(v) => set("align", v)} options={ALIGN_OPTS} />
        </div>
      );
    case "text":
      return (
        <div className="space-y-4">
          <Text label="Text" multiline value={block.text} onChange={(v) => set("text", v)} />
          <Select label="Align" value={block.align} onChange={(v) => set("align", v)} options={ALIGN_OPTS} />
        </div>
      );
    case "button":
      return (
        <div className="space-y-4">
          <Text label="Label" value={block.label} onChange={(v) => set("label", v)} />
          <Text label="URL" dir="ltr" value={block.url} onChange={(v) => set("url", v)} hint="https://, mailto:, tel: or a domain" />
          <Text label="Sub-label (optional)" value={block.sublabel} onChange={(v) => set("sublabel", v)} />
          <ImageField label="Thumbnail (optional)" value={block.thumbnailUrl} onChange={(v) => set("thumbnailUrl", v)} />
          <Select label="Highlight" value={block.highlight} onChange={(v) => set("highlight", v)} options={["none", "pulse", "shake"] as const} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Button colour" value={block.bg} onChange={(v) => set("bg", v)} />
            <ColorField label="Text colour" value={block.fg} onChange={(v) => set("fg", v)} />
          </div>
          <p className="text-xs text-stone-400">Leave colours empty to follow the theme.</p>
          <Toggle label="Open in new tab" checked={block.openInNewTab} onChange={(v) => set("openInNewTab", v)} />
        </div>
      );
    case "social":
      return <SocialForm block={block} onChange={onChange as (b: BlockOf<"social">) => void} />;
    case "video":
      return (
        <div className="space-y-4">
          <Text label="Video URL" dir="ltr" value={block.url} onChange={(v) => set("url", v)} hint="YouTube, Vimeo or TikTok link" />
          <Text label="Title (accessibility)" value={block.title} onChange={(v) => set("title", v)} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-4">
          <ImageField label="Image" value={block.src} onChange={(v) => set("src", v)} />
          <Text label="Alt text" value={block.alt} onChange={(v) => set("alt", v)} />
          <Text label="Link (optional)" dir="ltr" value={block.href} onChange={(v) => set("href", v)} />
          <Toggle label="Rounded corners" checked={block.rounded} onChange={(v) => set("rounded", v)} />
        </div>
      );
    case "contact":
      return (
        <div className="space-y-4">
          <Text label="Title" value={block.title} onChange={(v) => set("title", v)} />
          <Text label="Submit label" value={block.submitLabel} onChange={(v) => set("submitLabel", v)} />
          <Text label="Success message" value={block.successMessage} onChange={(v) => set("successMessage", v)} />
          <Toggle label="Ask for phone number" checked={block.askPhone} onChange={(v) => set("askPhone", v)} />
          <p className="text-xs text-stone-400">Submissions appear in Admin → Inbox.</p>
        </div>
      );
    case "spacer":
      return (
        <div className="space-y-4">
          <Select label="Size" value={block.size} onChange={(v) => set("size", v)} options={["sm", "md", "lg"] as const} />
          <Toggle label="Show divider line" checked={block.line} onChange={(v) => set("line", v)} />
        </div>
      );
  }
}

function SocialForm({ block, onChange }: Props<BlockOf<"social">>) {
  const items = block.items;
  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    onChange({ ...block, items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-4">
      <Select label="Style" value={block.style} onChange={(v) => onChange({ ...block, style: v })} options={["icons", "pills"] as const} />
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <select className="input w-36 shrink-0" value={it.platform} onChange={(e) => update(i, { platform: e.target.value as SocialPlatform })}>
            {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
          <input className="input" dir="ltr" value={it.url} placeholder="@handle, number or URL" onChange={(e) => update(i, { url: e.target.value })} />
          <button type="button" className="btn shrink-0" aria-label="Remove" onClick={() => onChange({ ...block, items: items.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button type="button" className="btn w-full" onClick={() => onChange({ ...block, items: [...items, { platform: "instagram", url: "" }] })}>
        + Add social link
      </button>
    </div>
  );
}
