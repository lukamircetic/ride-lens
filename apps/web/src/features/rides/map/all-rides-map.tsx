import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { MAPTILER_STYLE_URL } from "../constants";
import type { ActivityRoute } from "../types";
import { applyAppleDarkBasemapStyle } from "./basemap-style";
import { addAllRideRouteLayers, updateAllRideRouteData } from "./layers";
import { fitMapToRoutes } from "./map-fit";
import { MapEmptyState } from "./map-empty-state";

export function AllRidesMap({
  routes,
  selectedActivityId,
  hoveredActivityId,
  loading,
  onSelect,
}: {
  readonly routes: ReadonlyArray<ActivityRoute>;
  readonly selectedActivityId: string | null;
  readonly hoveredActivityId: string | null;
  readonly loading: boolean;
  readonly onSelect: (activityId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const routesWithGps = useMemo(() => routes.filter((route) => route.points.length >= 2), [routes]);
  const mapDataRef = useRef<{
    routesWithGps: ReadonlyArray<ActivityRoute>;
    selectedActivityId: string | null;
    hoveredActivityId: string | null;
  }>({ routesWithGps: [], selectedActivityId: null, hoveredActivityId: null });
  const hasRoutes = routesWithGps.length > 0;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    mapDataRef.current = { routesWithGps, selectedActivityId, hoveredActivityId };
  }, [routesWithGps, selectedActivityId, hoveredActivityId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPTILER_STYLE_URL || !hasRoutes) return;

    const firstPoint = mapDataRef.current.routesWithGps[0]?.points[0];
    if (!firstPoint) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      container: containerRef.current,
      center: [firstPoint.longitude, firstPoint.latitude],
      style: MAPTILER_STYLE_URL,
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      const current = mapDataRef.current;

      loadedRef.current = true;
      applyAppleDarkBasemapStyle(map);
      addAllRideRouteLayers(map);
      updateAllRideRouteData(
        map,
        current.routesWithGps,
        current.selectedActivityId,
        current.hoveredActivityId,
      );
      fitMapToRoutes(map, current.routesWithGps, { padding: 56 });
    });
    map.on("click", "all-ride-routes-hit", (event) => {
      const activityId = event.features?.[0]?.properties?.activityId;
      if (typeof activityId === "string") onSelectRef.current(activityId);
    });
    map.on("mouseenter", "all-ride-routes-hit", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "all-ride-routes-hit", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [hasRoutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    updateAllRideRouteData(map, routesWithGps, selectedActivityId, hoveredActivityId);
  }, [routesWithGps, selectedActivityId, hoveredActivityId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || routesWithGps.length === 0) return;

    fitMapToRoutes(map, routesWithGps, { padding: 56 });
  }, [routesWithGps]);

  return (
    <div className="flex min-w-0 flex-1 flex-col p-0">
      {loading ? (
        <div className="mb-2.5 flex items-center justify-between gap-3 font-ride text-[11px] font-bold uppercase text-ride-ink-dim">
          loading
        </div>
      ) : null}
      {!MAPTILER_STYLE_URL ? (
        <MapEmptyState
          title="Map key missing"
          body="Add VITE_MAPTILER_API_KEY to apps/web/.env or apps/web/.env.local."
        />
      ) : hasRoutes ? (
        <div className="relative min-h-0 flex-1 overflow-hidden border border-[#343a43] bg-[#20252c] max-[900px]:aspect-[0.82] max-[900px]:h-auto max-[900px]:min-h-[360px]">
          <div className="!absolute !inset-0" ref={containerRef} />
        </div>
      ) : (
        <MapEmptyState
          title="No mapped rides"
          body="Upload rides with GPS records to populate the map."
        />
      )}
    </div>
  );
}
