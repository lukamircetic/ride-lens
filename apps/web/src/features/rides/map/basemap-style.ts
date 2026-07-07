import type { Map as MapLibreMap } from "maplibre-gl";

import type { MapStyleLayer } from "./map-types";

export function applyAppleDarkBasemapStyle(map: MapLibreMap) {
  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    if (isRideLensLayer(layer.id)) continue;

    const key = layerKey(layer);
    if (shouldHideBasemapLayer(key)) {
      setLayerVisibility(map, layer.id, "none");
      continue;
    }

    if (layer.type === "background") {
      setLayerPaint(map, layer.id, "background-color", "#242a31");
      continue;
    }

    if (layer.type === "fill") {
      styleFillLayer(map, layer.id, key);
      continue;
    }

    if (layer.type === "line") {
      styleLineLayer(map, layer.id, key);
      continue;
    }

    if (layer.type === "symbol") {
      styleSymbolLayer(map, layer.id, key);
    }
  }
}

function styleFillLayer(map: MapLibreMap, layerId: string, key: string) {
  if (key.includes("water")) {
    setLayerPaint(map, layerId, "fill-color", "#1a3041");
    setLayerPaint(map, layerId, "fill-opacity", 0.9);
    return;
  }

  if (/(park|landcover|landuse|wood|forest|grass|natural|vegetation)/i.test(key)) {
    setLayerPaint(map, layerId, "fill-color", "#24352d");
    setLayerPaint(map, layerId, "fill-opacity", 0.58);
    return;
  }

  setLayerPaint(map, layerId, "fill-color", "#252b32");
  setLayerPaint(map, layerId, "fill-opacity", 0.94);
}

function styleLineLayer(map: MapLibreMap, layerId: string, key: string) {
  if (key.includes("water")) {
    setLayerPaint(map, layerId, "line-color", "#2b4b61");
    setLayerPaint(map, layerId, "line-opacity", 0.58);
    return;
  }

  if (/(bridge|tunnel|case|casing)/i.test(key)) {
    setLayerPaint(map, layerId, "line-color", "#313a43");
    setLayerPaint(map, layerId, "line-opacity", 0.58);
    return;
  }

  if (/(motorway|trunk|primary|major)/i.test(key)) {
    setLayerZoomRange(map, layerId, 5, 24);
    setLayerPaint(map, layerId, "line-color", "#56616c");
    setLayerPaint(map, layerId, "line-opacity", 0.66);
    return;
  }

  if (/(secondary|tertiary|transportation|road|street|highway|route)/i.test(key)) {
    setLayerZoomRange(map, layerId, 6, 24);
    setLayerPaint(map, layerId, "line-color", "#424d58");
    setLayerPaint(map, layerId, "line-opacity", 0.56);
    return;
  }

  if (/(path|track|minor|service)/i.test(key)) {
    setLayerZoomRange(map, layerId, 8, 24);
    setLayerPaint(map, layerId, "line-color", "#37434d");
    setLayerPaint(map, layerId, "line-opacity", 0.42);
    return;
  }

  if (/(boundary|admin|contour)/i.test(key)) {
    setLayerPaint(map, layerId, "line-color", "#4c5560");
    setLayerPaint(map, layerId, "line-opacity", 0.28);
    return;
  }

  setLayerPaint(map, layerId, "line-color", "#414b55");
  setLayerPaint(map, layerId, "line-opacity", 0.44);
}

function styleSymbolLayer(map: MapLibreMap, layerId: string, key: string) {
  if (/(place|city|town|village|settlement)/i.test(key)) {
    setLayerPaint(map, layerId, "text-color", "#d8dde2");
    setLayerPaint(map, layerId, "text-halo-color", "#252b32");
    setLayerPaint(map, layerId, "text-halo-width", 1.4);
    setLayerPaint(map, layerId, "text-opacity", 0.88);
    return;
  }

  if (/(road|street|highway|route|transportation)/i.test(key)) {
    setLayerZoomRange(map, layerId, 7, 24);
    setLayerPaint(map, layerId, "text-color", "#909ba5");
    setLayerPaint(map, layerId, "text-halo-color", "#252b32");
    setLayerPaint(map, layerId, "text-halo-width", 1);
    setLayerPaint(map, layerId, "text-opacity", 0.56);
    return;
  }

  setLayerPaint(map, layerId, "text-color", "#aab2ba");
  setLayerPaint(map, layerId, "text-halo-color", "#252b32");
  setLayerPaint(map, layerId, "text-halo-width", 1);
  setLayerPaint(map, layerId, "text-opacity", 0.46);
}

function shouldHideBasemapLayer(key: string): boolean {
  return /(rail|train|transit|station|subway|tram|airport|aeroway|ferry|poi|building|address|housenumber|parking|school|hospital|shop|restaurant|hotel|tourism|ski|hillshade|shade|terrain)/i.test(
    key,
  );
}

function layerKey(layer: MapStyleLayer): string {
  const sourceLayer =
    "source-layer" in layer && typeof layer["source-layer"] === "string"
      ? layer["source-layer"]
      : "";

  return `${layer.id} ${sourceLayer}`.toLowerCase();
}

function isRideLensLayer(layerId: string): boolean {
  return layerId.startsWith("selected-route") || layerId.startsWith("all-ride-routes");
}

function setLayerVisibility(map: MapLibreMap, layerId: string, visibility: "visible" | "none") {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, "visibility", visibility);
}

function setLayerPaint(map: MapLibreMap, layerId: string, property: string, value: unknown) {
  if (!map.getLayer(layerId)) return;

  try {
    map.setPaintProperty(layerId, property, value);
  } catch {
    // MapTiler styles vary by layer type and style version; unsupported paint keys are harmless.
  }
}

function setLayerZoomRange(map: MapLibreMap, layerId: string, minzoom: number, maxzoom: number) {
  if (!map.getLayer(layerId)) return;

  try {
    map.setLayerZoomRange(layerId, minzoom, maxzoom);
  } catch {
    // Some generated style layers may not accept runtime zoom-range changes.
  }
}
