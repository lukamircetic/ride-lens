import { cn } from "@ride-lens/ui/lib/utils";

export function GantryRow({
  label,
  value,
  unit,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}) {
  return (
    <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-3 border-t-2 border-white/85 px-3.5 py-[11px] first:border-t-0">
      <div className="flex items-center gap-2 font-ride text-[13px] font-bold uppercase">
        <span>{label}</span>
      </div>
      <div className="whitespace-nowrap font-ride-mono text-lg font-extrabold">
        {value}
        {unit ? (
          <small className="ml-1 text-[0.52em] font-semibold opacity-80">{unit}</small>
        ) : null}
      </div>
    </div>
  );
}

export function Sign({
  label,
  value,
  cap,
  accent,
  onClick,
}: {
  readonly label: string;
  readonly value: string;
  readonly cap?: string;
  readonly accent?: boolean;
  readonly onClick?: () => void;
}) {
  const className = cn(
    "bg-ride-abyss p-4 text-left font-[inherit] text-[inherit]",
    onClick &&
      "w-full cursor-pointer transition-colors hover:bg-ride-night hover:outline hover:outline-1 hover:outline-ride-amber",
  );
  const valueClassName = cn(
    "mt-2 font-ride-mono text-[26px] leading-none font-extrabold text-ride-ink",
    accent && "text-ride-amber",
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">{label}</div>
        <div className={valueClassName}>{value}</div>
        {cap ? <div className="mt-2.5 font-ride text-[11px] text-ride-ink-dim">{cap}</div> : null}
      </button>
    );
  }

  return (
    <div className={className}>
      <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className={valueClassName}>{value}</div>
      {cap ? <div className="mt-2.5 font-ride text-[11px] text-ride-ink-dim">{cap}</div> : null}
    </div>
  );
}
