import { formatRideTitle } from "../../formatters";
import type {
  ActivityRoute,
  ActivityRoutePoint,
  ActivitySegment,
  HeartRateZoneProfile,
  RouteMetric,
} from "../../types";
import { DIMMED_ZONE_COLOR, heartRateZoneColor, heartRateZoneNumber } from "../../heart-rate-zones";
import { getMetricColor, getMetricRange, getMetricValue } from "./metrics";

export function routeSegmentsFeatureCollection(
  points: ReadonlyArray<ActivityRoutePoint>,
  metric: RouteMetric,
  heartRateZoneProfile: HeartRateZoneProfile | null = null,
  selectedHeartRateZone: 1 | 2 | 3 | 4 | 5 | null = null,
) {
  const range = getMetricRange(points, metric);
  const features = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;

    const value = getMetricValue(current, metric);
    const zoneNumber =
      metric === "heartRate"
        ? heartRateZoneNumber(current.heartRateBpm, heartRateZoneProfile)
        : null;
    const useZoneColor = metric === "heartRate" && heartRateZoneProfile !== null;
    const selectedMatch = selectedHeartRateZone === null || zoneNumber === selectedHeartRateZone;
    features.push({
      type: "Feature",
      properties: {
        color: useZoneColor
          ? selectedMatch
            ? heartRateZoneColor(zoneNumber)
            : DIMMED_ZONE_COLOR
          : getMetricColor(value, range),
        opacity: selectedHeartRateZone === null || selectedMatch ? 1 : 0.3,
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

export function segmentRangesFeatureCollection(
  points: ReadonlyArray<ActivityRoutePoint>,
  segments: ReadonlyArray<ActivitySegment>,
  activeEffortId: string | null,
) {
  return {
    type: "FeatureCollection",
    features: segments.flatMap(({ effort, segment }) => {
      const coordinates = routeCoordinatesForRange(
        points,
        effort.startRecordIndex,
        effort.endRecordIndex,
      );
      if (coordinates.length < 2) return [];

      return [
        {
          type: "Feature",
          properties: {
            segmentId: segment.id,
            effortId: effort.id,
            name: segment.name,
            active: effort.id === activeEffortId,
          },
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      ];
    }),
  };
}

export function draftSegmentFeatureCollection(
  points: ReadonlyArray<ActivityRoutePoint>,
  startRecordIndex: number | null,
  endRecordIndex: number | null,
) {
  if (startRecordIndex === null || endRecordIndex === null) return emptyFeatureCollection();

  const coordinates = routeCoordinatesForRange(points, startRecordIndex, endRecordIndex);
  if (coordinates.length < 2) return emptyFeatureCollection();

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  };
}

export function segmentHandlesFeatureCollection(
  points: ReadonlyArray<ActivityRoutePoint>,
  startRecordIndex: number | null,
  endRecordIndex: number | null,
) {
  const start = findRoutePoint(points, startRecordIndex);
  const end = findRoutePoint(points, endRecordIndex);

  return {
    type: "FeatureCollection",
    features: [
      start
        ? {
            type: "Feature",
            properties: { kind: "start" },
            geometry: { type: "Point", coordinates: [start.longitude, start.latitude] },
          }
        : null,
      end
        ? {
            type: "Feature",
            properties: { kind: "end" },
            geometry: { type: "Point", coordinates: [end.longitude, end.latitude] },
          }
        : null,
    ].filter(Boolean),
  };
}

function routeCoordinatesForRange(
  points: ReadonlyArray<ActivityRoutePoint>,
  startRecordIndex: number,
  endRecordIndex: number,
): Array<[number, number]> {
  const start = Math.min(startRecordIndex, endRecordIndex);
  const end = Math.max(startRecordIndex, endRecordIndex);

  return points
    .filter((point) => point.recordIndex >= start && point.recordIndex <= end)
    .map((point) => [point.longitude, point.latitude]);
}

function findRoutePoint(
  points: ReadonlyArray<ActivityRoutePoint>,
  recordIndex: number | null,
): ActivityRoutePoint | null {
  if (recordIndex === null) return null;
  return points.find((point) => point.recordIndex === recordIndex) ?? null;
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
