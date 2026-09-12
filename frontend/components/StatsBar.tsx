import { weiToGen } from "@/lib/utils";

export function StatsBar({ stats }: { stats: any }) {
  if (!stats) return null;
  const items = [
    { label: "Total", value: stats.total ?? 0 },
    { label: "Funded", value: stats.funded ?? 0 },
    { label: "Disputed", value: stats.disputed ?? 0 },
    { label: "Resolved", value: stats.resolved ?? 0 },
    { label: "Paid", value: stats.paid ?? 0 },
    { label: "Volume (GEN)", value: weiToGen(stats.volume_wei ?? 0) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-white/10 bg-[var(--color-panel)] p-4">
          <div className="text-2xl font-bold">{String(it.value)}</div>
          <div className="text-xs text-[var(--color-muted)]">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
