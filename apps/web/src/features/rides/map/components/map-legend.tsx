import type { ActivityRoutePoint, HeartRateZoneProfile, RouteMetric } from "../../types";
import { formatHeartRateZoneRange, HEART_RATE_ZONE_COLORS } from "../../heart-rate-zones";
import { formatMetricValue, getMetricRange, metricLabel } from "../route/metrics";

export function MapLegend({
  metric,
  points,
  heartRateZoneProfile,
}: {
  readonly metric: RouteMetric;
  readonly points: ReadonlyArray<ActivityRoutePoint>;
  readonly heartRateZoneProfile?: HeartRateZoneProfile | null;
}) {
  const range = getMetricRange(points, metric);

  if (metric === "heartRate" && heartRateZoneProfile) {
    return (
      <div
        className="absolute bottom-[26px] left-3 z-[2] min-w-[250px] max-w-[calc(100%-24px)] border border-ride-ink/20 bg-ride-abyss/90 px-2.5 py-[9px] backdrop-blur-lg"
        aria-hidden="true"
      >
        <div className="mb-1.5 flex justify-between gap-3 font-ride text-[10px] font-semibold uppercase text-ride-ink-dim">
          <span>Heart-rate zones</span>
          <span>personal profile</span>
        </div>
        <div className="flex h-1.5">
          {heartRateZoneProfile.zones.map((zone) => (
            <span
              key={zone.number}
              className="flex-1"
              style={{ backgroundColor: HEART_RATE_ZONE_COLORS[zone.number] }}
            />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-5 gap-1 font-ride-mono text-[8px] text-ride-ink-dim">
          {heartRateZoneProfile.zones.map((zone) => (
            <span key={zone.number} title={formatHeartRateZoneRange(zone)}>
              Z{zone.number} · {zone.lowerBpm}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-[26px] left-3 z-[2] min-w-[190px] max-w-[calc(100%-24px)] border border-ride-ink/20 bg-ride-abyss/85 px-2.5 py-[9px] backdrop-blur-lg"
      aria-hidden="true"
    >
      <div className="mb-1.5 flex justify-between gap-3 font-ride text-[10px] font-semibold uppercase text-ride-ink-dim">
        <span>{metricLabel(metric)}</span>
        <span>{range === null ? "n/a" : `${formatMetricValue(range.max, metric)} max`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#6086ff,#f2efe6,#ffc72c)]" />
      <div className="mt-1.5 flex justify-between font-ride-mono text-[10px] text-ride-ink-dim">
        <span>{range === null ? "low" : formatMetricValue(range.min, metric)}</span>
        <span>{range === null ? "high" : formatMetricValue(range.max, metric)}</span>
      </div>
    </div>
  );
}
