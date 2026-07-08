export function MapEmptyState({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center border border-ride-line bg-[repeating-linear-gradient(45deg,var(--abyss)_0_12px,var(--night-2)_12px_13px)] p-[22px] text-center font-ride-mono text-xs text-ride-ink-dim">
      <div>
        <strong className="mb-1.5 block font-ride text-[15px] uppercase text-ride-ink">
          {title}
        </strong>
        <span>{body}</span>
      </div>
    </div>
  );
}
