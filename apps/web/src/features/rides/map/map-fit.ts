import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";

import type { ActivityRoute, ActivityRoutePoint } from "../types";

export function fitMapToRoutes(
  map: MapLibreMap,
  routes: ReadonlyArray<ActivityRoute>,
  options: { readonly padding: number },
) {
  const points = routes.flatMap((route) => route.points);
  fitMapToPoints(map, points, options);
}

export function fitMapToPoints(
  map: MapLibreMap,
  points: ReadonlyArray<ActivityRoutePoint>,
  options: { readonly padding: number },
) {
  if (points.length < 2) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const point of points) {
    bounds.extend([point.longitude, point.latitude]);
  }

  if (bounds.isEmpty()) return;

  map.fitBounds(bounds, {
    duration: 650,
    maxZoom: 15,
    padding: options.padding,
  });
}
