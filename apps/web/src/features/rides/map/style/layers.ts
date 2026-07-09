import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import type { ActivityRoute, ActivityRoutePoint, ActivitySegment, RouteMetric } from "../../types";
import {
  allRideRoutesFeatureCollection,
  draftSegmentFeatureCollection,
  emptyFeatureCollection,
  routeEndpointsFeatureCollection,
  routeSegmentsFeatureCollection,
  segmentHandlesFeatureCollection,
  segmentRangesFeatureCollection,
} from "../route/geojson";
import type { GeoJsonData, MapLayerSpecification, MapSourceSpecification } from "./map-types";

const ACTIVE_SEGMENT_CASING_COLOR = "#0b5138";
const ACTIVE_SEGMENT_LINE_COLOR = "#48e394";

export function addSelectedRouteLayers(map: MapLibreMap) {
  if (map.getSource("selected-route-segments")) return;

  map.addSource("selected-route-segments", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);
  map.addSource("selected-route-points", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);
  map.addLayer({
    id: "selected-route-casing",
    type: "line",
    source: "selected-route-segments",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#111820",
      "line-opacity": 0.98,
      "line-width": 11,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "selected-route-glow",
    type: "line",
    source: "selected-route-segments",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffc72c",
      "line-blur": 1.1,
      "line-opacity": 0.58,
      "line-width": 8,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "selected-route-line",
    type: "line",
    source: "selected-route-segments",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 5.4,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "selected-route-points",
    type: "circle",
    source: "selected-route-points",
    paint: {
      "circle-color": ["case", ["==", ["get", "kind"], "start"], "#f2efe6", "#ffc72c"],
      "circle-radius": ["case", ["==", ["get", "kind"], "start"], 5, 6],
      "circle-stroke-color": "#1b1d21",
      "circle-stroke-width": 2,
    },
  } as MapLayerSpecification);
}

export function updateSelectedRouteData(
  map: MapLibreMap,
  points: ReadonlyArray<ActivityRoutePoint>,
  metric: RouteMetric,
) {
  setGeoJsonSourceData(
    map,
    "selected-route-segments",
    routeSegmentsFeatureCollection(points, metric),
  );
  setGeoJsonSourceData(map, "selected-route-points", routeEndpointsFeatureCollection(points));
}

export function addSegmentOverlayLayers(map: MapLibreMap) {
  if (map.getSource("ride-segment-ranges")) return;

  map.addSource("ride-segment-ranges", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);
  map.addSource("draft-segment-range", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);
  map.addSource("segment-handles", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);

  map.addLayer({
    id: "ride-segment-ranges-casing",
    type: "line",
    source: "ride-segment-ranges",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ACTIVE_SEGMENT_CASING_COLOR,
      "line-opacity": ["case", ["boolean", ["get", "active"], false], 0.98, 0],
      "line-width": ["case", ["boolean", ["get", "active"], false], 11, 0],
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "ride-segment-ranges",
    type: "line",
    source: "ride-segment-ranges",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": [
        "case",
        ["boolean", ["get", "active"], false],
        ACTIVE_SEGMENT_LINE_COLOR,
        "#78b7c8",
      ],
      "line-opacity": ["case", ["boolean", ["get", "active"], false], 1, 0.82],
      "line-width": ["case", ["boolean", ["get", "active"], false], 6.5, 4],
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "draft-segment-range",
    type: "line",
    source: "draft-segment-range",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#f2efe6",
      "line-opacity": 0.96,
      "line-width": 7.5,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "segment-handles",
    type: "circle",
    source: "segment-handles",
    paint: {
      "circle-color": ["case", ["==", ["get", "kind"], "start"], "#f2efe6", "#ffc72c"],
      "circle-radius": 7,
      "circle-stroke-color": "#111820",
      "circle-stroke-width": 2.5,
    },
  } as MapLayerSpecification);
}

export function addReplayLayers(map: MapLibreMap) {
  if (map.getSource("ride-replay-trail")) return;

  map.addSource("ride-replay-trail", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);
  map.addSource("ride-replay-rider", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);

  map.addLayer({
    id: "ride-replay-trail-casing",
    type: "line",
    source: "ride-replay-trail",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#05070a",
      "line-opacity": 0.94,
      "line-width": 11,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "ride-replay-trail",
    type: "line",
    source: "ride-replay-trail",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#f2efe6",
      "line-opacity": 0.98,
      "line-width": 5.8,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "ride-replay-rider-halo",
    type: "circle",
    source: "ride-replay-rider",
    paint: {
      "circle-color": "#ffc72c",
      "circle-opacity": 0.24,
      "circle-radius": 16,
      "circle-blur": 0.55,
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "ride-replay-rider",
    type: "circle",
    source: "ride-replay-rider",
    paint: {
      "circle-color": "#ffc72c",
      "circle-radius": 7,
      "circle-stroke-color": "#111820",
      "circle-stroke-width": 3,
    },
  } as MapLayerSpecification);
}

export function updateReplayLayerData(
  map: MapLibreMap,
  coordinates: ReadonlyArray<readonly [number, number]>,
  currentCoordinate: readonly [number, number] | null,
) {
  setGeoJsonSourceData(map, "ride-replay-trail", replayTrailFeatureCollection(coordinates));
  setGeoJsonSourceData(map, "ride-replay-rider", replayRiderFeatureCollection(currentCoordinate));
}

export function updateSegmentOverlayData(
  map: MapLibreMap,
  points: ReadonlyArray<ActivityRoutePoint>,
  segments: ReadonlyArray<ActivitySegment>,
  activeSegmentId: string | null,
  draftStartRecordIndex: number | null,
  draftEndRecordIndex: number | null,
) {
  setGeoJsonSourceData(
    map,
    "ride-segment-ranges",
    segmentRangesFeatureCollection(points, segments, activeSegmentId),
  );
  setGeoJsonSourceData(
    map,
    "draft-segment-range",
    draftSegmentFeatureCollection(points, draftStartRecordIndex, draftEndRecordIndex),
  );
  setGeoJsonSourceData(
    map,
    "segment-handles",
    segmentHandlesFeatureCollection(points, draftStartRecordIndex, draftEndRecordIndex),
  );
}

function replayTrailFeatureCollection(coordinates: ReadonlyArray<readonly [number, number]>) {
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

function replayRiderFeatureCollection(coordinate: readonly [number, number] | null) {
  if (coordinate === null) return emptyFeatureCollection();

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: coordinate },
      },
    ],
  };
}

export function addAllRideRouteLayers(map: MapLibreMap) {
  if (map.getSource("all-ride-routes")) return;

  map.addSource("all-ride-routes", {
    type: "geojson",
    data: emptyFeatureCollection() as GeoJsonData,
  } as MapSourceSpecification);
  map.addLayer({
    id: "all-ride-routes-casing",
    type: "line",
    source: "all-ride-routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#07090d",
      "line-opacity": [
        "case",
        ["boolean", ["get", "hovered"], false],
        0.98,
        ["boolean", ["get", "selected"], false],
        0.95,
        0.74,
      ],
      "line-width": [
        "case",
        ["boolean", ["get", "hovered"], false],
        10,
        ["boolean", ["get", "selected"], false],
        9,
        5,
      ],
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "all-ride-routes-line",
    type: "line",
    source: "all-ride-routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": [
        "case",
        ["boolean", ["get", "hovered"], false],
        "#f2efe6",
        ["boolean", ["get", "selected"], false],
        "#ffc72c",
        "#78b7c8",
      ],
      "line-opacity": [
        "case",
        ["boolean", ["get", "hovered"], false],
        1,
        ["boolean", ["get", "selected"], false],
        1,
        0.82,
      ],
      "line-width": [
        "case",
        ["boolean", ["get", "hovered"], false],
        5.3,
        ["boolean", ["get", "selected"], false],
        4.4,
        2.5,
      ],
    },
  } as MapLayerSpecification);
  map.addLayer({
    id: "all-ride-routes-hit",
    type: "line",
    source: "all-ride-routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#000000",
      "line-opacity": 0,
      "line-width": 18,
    },
  } as MapLayerSpecification);
}

export function updateAllRideRouteData(
  map: MapLibreMap,
  routes: ReadonlyArray<ActivityRoute>,
  selectedActivityId: string | null,
  hoveredActivityId: string | null,
) {
  setGeoJsonSourceData(
    map,
    "all-ride-routes",
    allRideRoutesFeatureCollection(routes, selectedActivityId, hoveredActivityId),
  );
}

function setGeoJsonSourceData(map: MapLibreMap, sourceId: string, data: unknown) {
  const source = map.getSource(sourceId);
  if (!source || !("setData" in source)) return;

  (source as GeoJSONSource).setData(data as GeoJsonData);
}
