"use client";

import { FONT_KEYS, type PageContent, type Theme } from "@/lib/blocks";
import { FONTS } from "@/lib/fonts";
import { THEME_PRESETS } from "@/lib/presets";
import { backgroundStyle } from "@/components/renderer/PageRenderer";
import { ColorField, ImageField, Select, Toggle } from "./fields";

export function ThemePanel({ content, onChange }: { content: PageContent; onChange: (c: PageContent) => void }) {
  const t = content.theme;
  const set = (patch: Partial<Theme>) => onChange({ ...content, theme: { ...t, ...patch, preset: patch.preset ?? "custom" } });

  return (
    <div className="space-y-6">
      <section>
        <h3 className="label">Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((p) => {
            const full = { ...t, ...p.theme } as Theme;
            return (
              <button key={p.key} type="button" onClick={() => set({ ...p.theme, preset: p.key })}
                className={`relative h-16 rounded-lg border-2 text-xs font-semibold ${t.preset === p.key ? "border-stone-900" : "border-transparent"}`}
                style={{ ...backgroundStyle(full), color: full.textColor }}>
                {p.label}
                {p.pro && <span className="absolute end-1 top-1 rounded bg-amber-400 px-1 text-[9px] text-stone-900">PRO</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="label">Language & direction</h3>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Direction" value={content.dir} onChange={(v) => onChange({ ...content, dir: v })}
            options={[{ value: "ltr", label: "Left → right" }, { value: "rtl", label: "Right → left (Arabic)" }] as const} />
          <Select label="Language" value={content.lang} onChange={(v) => onChange({ ...content, lang: v })}
            options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }, { value: "fr", label: "Français" }]} />
        </div>
        <Select label="Font" value={t.font} onChange={(v) => set({ font: v })}
          options={FONT_KEYS.map((k) => ({ value: k, label: FONTS[k].label }))} />
      </section>

      <section className="space-y-4">
        <h3 className="label">Background</h3>
        <Select label="Type" value={t.bgType} onChange={(v) => set({ bgType: v })} options={["solid", "gradient", "image"] as const} />
        {t.bgType === "solid" && <ColorField label="Colour" value={t.bgColor} onChange={(v) => set({ bgColor: v })} />}
        {t.bgType === "gradient" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="From" value={t.bgFrom} onChange={(v) => set({ bgFrom: v })} />
              <ColorField label="To" value={t.bgTo} onChange={(v) => set({ bgTo: v })} />
            </div>
            <label className="block">
              <span className="label">Angle: {t.bgAngle}°</span>
              <input type="range" min={0} max={360} value={t.bgAngle} className="w-full accent-stone-900" onChange={(e) => set({ bgAngle: Number(e.target.value) })} />
            </label>
          </>
        )}
        {t.bgType === "image" && (
          <>
            <ImageField label="Image" value={t.bgImage} onChange={(v) => set({ bgImage: v })} />
            <label className="block">
              <span className="label">Darken: {Math.round(t.bgOverlay * 100)}%</span>
              <input type="range" min={0} max={0.9} step={0.05} value={t.bgOverlay} className="w-full accent-stone-900" onChange={(e) => set({ bgOverlay: Number(e.target.value) })} />
            </label>
          </>
        )}
        <ColorField label="Text colour" value={t.textColor} onChange={(v) => set({ textColor: v })} />
      </section>

      <section className="space-y-4">
        <h3 className="label">Buttons</h3>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Button" value={t.buttonBg} onChange={(v) => set({ buttonBg: v })} />
          <ColorField label="Button text" value={t.buttonFg} onChange={(v) => set({ buttonFg: v })} />
          <Select label="Style" value={t.buttonStyle} onChange={(v) => set({ buttonStyle: v })} options={["filled", "outline", "soft", "shadow"] as const} />
          <Select label="Corners" value={t.buttonRadius} onChange={(v) => set({ buttonRadius: v })} options={["none", "md", "lg", "full"] as const} />
        </div>
      </section>

      <Toggle label="Show 'LinkDeck' footer" checked={content.showBranding} onChange={(v) => onChange({ ...content, showBranding: v })} />
    </div>
  );
}
