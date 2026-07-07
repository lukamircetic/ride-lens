import type { ActivityRoutePoint, RouteMetric } from "../types";
import { formatMetricValue, getMetricRange, metricLabel } from "./metrics";

export function MapLegend({
  metric,
  points,
}: {
  readonly metric: RouteMetric;
  readonly points: ReadonlyArray<ActivityRoutePoint>;
}) {
  const range = getMetricRange(points, metric);

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
