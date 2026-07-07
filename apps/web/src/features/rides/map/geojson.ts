import { formatRideTitle } from "../formatters";
import type { ActivityRoute, ActivityRoutePoint, RouteMetric } from "../types";
import { getMetricColor, getMetricRange, getMetricValue } from "./metrics";

export function routeSegmentsFeatureCollection(
  points: ReadonlyArray<ActivityRoutePoint>,
  metric: RouteMetric,
) {
  const range = getMetricRange(points, metric);
  const features = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;

    const value = getMetricValue(current, metric);
    features.push({
      type: "Feature",
      properties: {
        color: getMetricColor(value, range),
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [previous.longitude, previous.latitude],
          [current.longitude, current.latitude],
        ],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function routeEndpointsFeatureCollection(points: ReadonlyArray<ActivityRoutePoint>) {
  const start = points[0];
  const end = points.at(-1);
  const features = [];

  if (start) {
    features.push({
      type: "Feature",
      properties: { kind: "start" },
      geometry: { type: "Point", coordinates: [start.longitude, start.latitude] },
    });
  }

  if (end) {
    features.push({
      type: "Feature",
      properties: { kind: "end" },
      geometry: { type: "Point", coordinates: [end.longitude, end.latitude] },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function allRideRoutesFeatureCollection(
  routes: ReadonlyArray<ActivityRoute>,
  selectedActivityId: string | null,
  hoveredActivityId: string | null,
) {
  return {
    type: "FeatureCollection",
    features: routes
      .filter((route) => route.points.length >= 2)
      .map((route) => ({
        type: "Feature",
        properties: {
          activityId: route.activity.id,
          name: formatRideTitle(route.activity),
          selected: route.activity.id === selectedActivityId,
          hovered: route.activity.id === hoveredActivityId,
        },
        geometry: {
          type: "LineString",
          coordinates: route.points.map((point) => [point.longitude, point.latitude]),
        },
      })),
  };
}

export function emptyFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: [],
  };
}
