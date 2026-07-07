import { formatBpm, formatSpeed } from "../formatters";
import type { ActivityRoutePoint, RouteMetric } from "../types";

export function getMetricRange(points: ReadonlyArray<ActivityRoutePoint>, metric: RouteMetric) {
  const values = points
    .map((point) => getMetricValue(point, metric))
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length === 0) return null;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function routeMetricAvailability(
  points: ReadonlyArray<ActivityRoutePoint>,
): Record<RouteMetric, boolean> {
  return {
    speed: points.some((point) => getMetricValue(point, "speed") !== null),
    heartRate: points.some((point) => getMetricValue(point, "heartRate") !== null),
    elevation: points.some((point) => getMetricValue(point, "elevation") !== null),
  };
}

export function firstAvailableRouteMetric(available: Record<RouteMetric, boolean>): RouteMetric {
  if (available.speed) return "speed";
  if (available.elevation) return "elevation";
  return "heartRate";
}

export function getMetricValue(point: ActivityRoutePoint, metric: RouteMetric): number | null {
  if (metric === "speed") return point.speedMetersPerSecond;
  if (metric === "heartRate") return point.heartRateBpm;
  return point.altitudeMeters;
}

export function getMetricColor(
  value: number | null,
  range: { readonly min: number; readonly max: number } | null,
): string {
  if (value === null || range === null) return "#f2efe6";

  const span = Math.max(range.max - range.min, 0.00001);
  const t = span === 0.00001 ? 0.5 : Math.min(1, Math.max(0, (value - range.min) / span));

  if (t < 0.5) {
    return interpolateColor([96, 134, 255], [242, 239, 230], t * 2);
  }

  return interpolateColor([242, 239, 230], [255, 199, 44], (t - 0.5) * 2);
}

export function metricLabel(metric: RouteMetric): string {
  if (metric === "speed") return "Speed";
  if (metric === "heartRate") return "Heart rate";
  return "Elevation";
}

export function formatMetricValue(value: number, metric: RouteMetric): string {
  if (metric === "speed") return formatSpeed(value);
  if (metric === "heartRate") return formatBpm(value);
  return `${Math.round(value).toLocaleString()} m`;
}

function interpolateColor(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
) {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);

  return `rgb(${r}, ${g}, ${b})`;
}
