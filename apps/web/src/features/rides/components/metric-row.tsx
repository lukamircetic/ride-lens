export function MetricRow({ k, v }: { readonly k: string; readonly v: string }) {
  return (
    <div className="flex justify-between bg-ride-abyss px-3.5 py-[11px]">
      <span className="font-ride text-[11px] font-semibold uppercase text-ride-ink-dim">{k}</span>
      <span className="font-ride-mono text-[13px] text-ride-ink">{v}</span>
    </div>
  );
}
