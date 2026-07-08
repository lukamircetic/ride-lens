import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

export type GeoJsonData = Parameters<GeoJSONSource["setData"]>[0];
export type MapLayerSpecification = Parameters<MapLibreMap["addLayer"]>[0];
export type MapSourceSpecification = Parameters<MapLibreMap["addSource"]>[1];
export type MapStyleLayer = NonNullable<ReturnType<MapLibreMap["getStyle"]>["layers"]>[number];
