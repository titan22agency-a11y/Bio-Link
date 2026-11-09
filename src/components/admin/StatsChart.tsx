import type { DayRow } from "@/lib/analytics";

/** Dependency-free SVG bar chart: views (dark) with clicks (amber) overlaid. */
export function StatsChart({ series }: { series: DayRow[] }) {
  const max = Math.max(1, ...series.map((d) => d.views));
  const w = 100 / series.length;
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Views and clicks per day">
        {series.map((d, i) => {
          const vh = (d.views / max) * 38;
          const ch = (d.clicks / max) * 38;
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.views} views, ${d.clicks} clicks`}</title>
              <rect x={i * w + w * 0.15} y={40 - vh} width={w * 0.7} height={vh} fill="#44403c" rx="0.4" />
              <rect x={i * w + w * 0.3} y={40 - ch} width={w * 0.4} height={ch} fill="#f59e0b" rx="0.3" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-stone-400">
        <span>{series[0]?.date}</span>
        <span className="flex gap-3">
          <span><span className="me-1 inline-block h-2 w-2 rounded-sm bg-stone-700" />Views</span>
          <span><span className="me-1 inline-block h-2 w-2 rounded-sm bg-amber-500" />Clicks</span>
        </span>
        <span>{series.at(-1)?.date}</span>
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
