import { STATE_META } from "@/lib/utils";

export function StatusBadge({ state }: { state: string }) {
  const meta = STATE_META[state] ?? { label: state, color: "var(--color-muted)" };
  const c = meta.color;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ color: c, background: "color-mix(in srgb, " + c + " 15%, transparent)", border: "1px solid color-mix(in srgb, " + c + " 35%, transparent)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {meta.label}
    </span>
  );
}
