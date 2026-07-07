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
    <div className="map-legend" aria-hidden="true">
      <div className="lk">
        <span>{metricLabel(metric)}</span>
        <span>{range === null ? "n/a" : `${formatMetricValue(range.max, metric)} max`}</span>
      </div>
      <div className="grad" />
      <div className="lv">
        <span>{range === null ? "low" : formatMetricValue(range.min, metric)}</span>
        <span>{range === null ? "high" : formatMetricValue(range.max, metric)}</span>
      </div>
    </div>
  );
}
