import type { HeartRateZoneAnalysis } from "@ride-lens/api";
import { Button } from "@ride-lens/ui/components/button";
import { cn } from "@ride-lens/ui/lib/utils";

import { formatDuration, formatPercentShare } from "../formatters";
import {
  BELOW_ZONE_COLOR,
  formatHeartRateZoneRange,
  heartRateZoneMethodLabel,
  HEART_RATE_ZONE_COLORS,
} from "../heart-rate-zones";

export function HeartRateZoneDistribution({
  analysis,
  selectedZone,
  onSelectZone,
}: {
  readonly analysis: HeartRateZoneAnalysis;
  readonly selectedZone: 1 | 2 | 3 | 4 | 5 | null;
  readonly onSelectZone: (zone: 1 | 2 | 3 | 4 | 5 | null) => void;
}) {
  const { distribution, profile } = analysis;

  return (
    <section className="mt-3.5 border border-ride-line bg-ride-abyss">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ride-line px-4 py-3">
        <div>
          <div className="font-ride text-[11px] font-bold uppercase text-ride-ink-muted">
            Effort distribution
          </div>
          <div className="mt-1 font-ride text-[10px] text-ride-ink-dim">
            Select a zone to trace that effort across the chart and road.
          </div>
        </div>
        <div className="text-right font-ride-mono text-[10px] text-ride-ink-dim">
          <div className="text-ride-ink-muted">
            {formatDuration(distribution.classifiedSeconds)} classified ·{" "}
            {formatPercentShare(distribution.coverageRatio)} coverage
          </div>
          <div className="mt-1">{heartRateZoneMethodLabel(profile)}</div>
        </div>
      </div>

      <div className="flex h-3 bg-ride-night-2" role="img" aria-label="Heart-rate effort ribbon">
        {distribution.belowZoneSeconds > 0 ? (
          <span
            style={{
              backgroundColor: BELOW_ZONE_COLOR,
              width: `${distribution.belowZoneShare * 100}%`,
            }}
            title={`Below Z1 ${formatDuration(distribution.belowZoneSeconds)}`}
          />
        ) : null}
        {distribution.zones.map((zone) => (
          <span
            key={zone.number}
            className={cn(
              "transition-opacity",
              selectedZone !== null && selectedZone !== zone.number && "opacity-20",
            )}
            style={{
              backgroundColor: HEART_RATE_ZONE_COLORS[zone.number],
              width: `${zone.share * 100}%`,
            }}
            title={`Z${zone.number} ${zone.name} ${formatDuration(zone.seconds)}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-px bg-ride-line-soft max-[900px]:grid-cols-2">
        {distribution.zones.map((zone) => {
          const active = selectedZone === zone.number;
          const subdued = selectedZone !== null && !active;

          return (
            <Button
              key={zone.number}
              type="button"
              variant="unstyled"
              className={cn(
                "min-h-[96px] bg-ride-night-2 p-3 text-left transition-[background-color,opacity] hover:bg-[#22272d] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ride-amber",
                active && "bg-[#252b30]",
                subdued && "opacity-45",
              )}
              aria-pressed={active}
              onClick={() => onSelectZone(active ? null : zone.number)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
                  Z{zone.number} {zone.name}
                </span>
                <span
                  className="size-2.5 shrink-0"
                  style={{ backgroundColor: HEART_RATE_ZONE_COLORS[zone.number] }}
                  aria-hidden="true"
                />
              </span>
              <span className="mt-2 block font-ride-mono text-[18px] font-semibold text-ride-ink">
                {formatDuration(zone.seconds)}
              </span>
              <span className="mt-1 flex justify-between gap-2 font-ride-mono text-[9px] text-ride-ink-dim">
                <span>{formatHeartRateZoneRange(zone)}</span>
                <span>{formatPercentShare(zone.share)}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
