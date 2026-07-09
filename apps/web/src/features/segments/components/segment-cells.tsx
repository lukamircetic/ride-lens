export function SummaryCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-[112px] bg-ride-abyss px-3.5 py-3">
      <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className="mt-1 font-ride-mono text-[18px] font-semibold text-ride-ink">{value}</div>
    </div>
  );
}

export function MiniCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 bg-ride-abyss px-2 py-1.5">
      <div className="font-ride text-[8px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className="mt-0.5 truncate font-ride-mono text-[11px] text-ride-ink-muted">{value}</div>
    </div>
  );
}
