import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import { MAPTILER_STYLE_URL } from "../constants";
import type { ActivityRecord, RouteMetric } from "../types";
import { applyAppleDarkBasemapStyle } from "./basemap-style";
import { addSelectedRouteLayers, updateSelectedRouteData } from "./layers";
import { fitMapToPoints } from "./map-fit";
import { MapEmptyState } from "./map-empty-state";
import { MapLegend } from "./map-legend";
import { MapMetricButton } from "./map-metric-button";
import { firstAvailableRouteMetric, routeMetricAvailability } from "./metrics";
import { recordsToRoutePoints } from "./route-points";

export function RouteMap({
  records,
  loading,
}: {
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly loading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const routeStateRef = useRef<{
    points: ReturnType<typeof recordsToRoutePoints>;
    metric: RouteMetric;
  }>({ points: [], metric: "speed" });
  const [metric, setMetric] = useState<RouteMetric>("speed");
  const points = useMemo(() => recordsToRoutePoints(records), [records]);
  const availableMetrics = useMemo(() => routeMetricAvailability(points), [points]);
  const hasRoute = points.length >= 2;

  useEffect(() => {
    routeStateRef.current = { points, metric };
  }, [points, metric]);

  useEffect(() => {
    if (!availableMetrics[metric]) {
      setMetric(firstAvailableRouteMetric(availableMetrics));
    }
  }, [availableMetrics, metric]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPTILER_STYLE_URL || !hasRoute) return;

    const firstPoint = routeStateRef.current.points[0];
    if (!firstPoint) return;

    const map = new maplibregl.Map({
      attributionControl: false,
      container: containerRef.current,
      center: [firstPoint.longitude, firstPoint.latitude],
      style: MAPTILER_STYLE_URL,
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      const current = routeStateRef.current;

      loadedRef.current = true;
      applyAppleDarkBasemapStyle(map);
      addSelectedRouteLayers(map);
      updateSelectedRouteData(map, current.points, current.metric);
      fitMapToPoints(map, current.points, { padding: 48 });
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [hasRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    updateSelectedRouteData(map, points, metric);
  }, [points, metric]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || points.length < 2) return;

    fitMapToPoints(map, points, { padding: 48 });
  }, [points]);

  return (
    <div className="min-w-0 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3 font-ride text-[11px] font-bold uppercase text-ride-ink-dim">
        <span className="inline-flex items-center text-ride-ink-muted">Route</span>
        {loading ? <span>loading</span> : null}
      </div>
      {!MAPTILER_STYLE_URL ? (
        <MapEmptyState
          title="Map key missing"
          body="Add VITE_MAPTILER_API_KEY to apps/web/.env or apps/web/.env.local."
        />
      ) : hasRoute ? (
        <div className="relative aspect-[1.25] min-h-[420px] overflow-hidden border border-[#343a43] bg-[#20252c] max-[900px]:aspect-[0.82] max-[900px]:h-auto max-[900px]:min-h-[360px]">
          <div
            className="absolute top-3 left-3 z-[2] flex max-w-[calc(100%-88px)] flex-wrap gap-1.5 max-[900px]:right-3 max-[900px]:max-w-none"
            aria-label="Route metric"
          >
            <MapMetricButton
              metric="speed"
              activeMetric={metric}
              available={availableMetrics.speed}
              onSelect={setMetric}
            />
            <MapMetricButton
              metric="heartRate"
              activeMetric={metric}
              available={availableMetrics.heartRate}
              onSelect={setMetric}
            />
            <MapMetricButton
              metric="elevation"
              activeMetric={metric}
              available={availableMetrics.elevation}
              onSelect={setMetric}
            />
          </div>
          <div className="!absolute !inset-0" ref={containerRef} />
          <MapLegend metric={metric} points={points} />
        </div>
      ) : (
        <MapEmptyState
          title="No GPS route"
          body="This ride does not have enough GPS points to render a route."
        />
      )}
    </div>
  );
}
