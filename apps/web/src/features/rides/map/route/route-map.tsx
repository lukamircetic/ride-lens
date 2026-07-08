import maplibregl, { type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import { MAPTILER_STYLE_URL } from "../../constants";
import {
  formatBpm,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
} from "../../formatters";
import type { ActivityRecord, ActivitySegment, ActivityRoutePoint, RouteMetric } from "../../types";
import { MapEmptyState } from "../components/map-empty-state";
import { MapLegend } from "../components/map-legend";
import { MapMetricButton } from "../components/map-metric-button";
import { type RideReplay, ReplayMapControls, useReplayMapEffects } from "../replay/ride-replay";
import { applyAppleDarkBasemapStyle } from "../style/basemap-style";
import {
  addSegmentOverlayLayers,
  addSelectedRouteLayers,
  updateSegmentOverlayData,
  updateSelectedRouteData,
} from "../style/layers";
import { fitMapToPoints } from "../style/map-fit";
import { firstAvailableRouteMetric, routeMetricAvailability } from "./metrics";
import { recordsToRoutePoints } from "./route-points";

export function RouteMap({
  records,
  loading,
  segments,
  replay,
  creatingSegment,
  segmentError,
  onCreateSegment,
  onUpdateSegment,
}: {
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly loading: boolean;
  readonly segments: ReadonlyArray<ActivitySegment>;
  readonly replay: RideReplay;
  readonly creatingSegment: boolean;
  readonly segmentError: string | null;
  readonly onCreateSegment: (payload: {
    readonly name: string;
    readonly startRecordIndex: number;
    readonly endRecordIndex: number;
  }) => Promise<void>;
  readonly onUpdateSegment: (
    segmentId: string,
    payload: {
      readonly name: string;
      readonly startRecordIndex: number;
      readonly endRecordIndex: number;
    },
  ) => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const routeStateRef = useRef<{
    points: ReturnType<typeof recordsToRoutePoints>;
    metric: RouteMetric;
  }>({ points: [], metric: "speed" });
  const [metric, setMetric] = useState<RouteMetric>("speed");
  const [segmentMode, setSegmentMode] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [showSegments, setShowSegments] = useState(true);
  const [activeEffortId, setActiveEffortId] = useState<string | null>(null);
  const [draftStartRecordIndex, setDraftStartRecordIndex] = useState<number | null>(null);
  const [draftEndRecordIndex, setDraftEndRecordIndex] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const points = useMemo(() => recordsToRoutePoints(records), [records]);
  const availableMetrics = useMemo(() => routeMetricAvailability(points), [points]);
  const visibleSegments = showSegments ? segments : [];
  const activeSegment = segments.find(({ effort }) => effort.id === activeEffortId) ?? null;
  const segmentOverlayStateRef = useRef({
    points,
    visibleSegments,
    activeEffortId,
    segmentMode,
    draftStartRecordIndex,
    draftEndRecordIndex,
  });
  const draftStats = useMemo(
    () => computeDraftSegmentStats(records, draftStartRecordIndex, draftEndRecordIndex),
    [records, draftStartRecordIndex, draftEndRecordIndex],
  );
  const hasRoute = points.length >= 2;
  useReplayMapEffects({ map: mapReady ? mapRef.current : null, replay });
  const canSaveDraft =
    draftName.trim().length > 0 &&
    draftStartRecordIndex !== null &&
    draftEndRecordIndex !== null &&
    draftStartRecordIndex !== draftEndRecordIndex;

  useEffect(() => {
    routeStateRef.current = { points, metric };
  }, [points, metric]);

  useEffect(() => {
    if (!availableMetrics[metric]) {
      setMetric(firstAvailableRouteMetric(availableMetrics));
    }
  }, [availableMetrics, metric]);

  useEffect(() => {
    segmentOverlayStateRef.current = {
      points,
      visibleSegments,
      activeEffortId,
      segmentMode,
      draftStartRecordIndex,
      draftEndRecordIndex,
    };
  }, [
    points,
    visibleSegments,
    activeEffortId,
    segmentMode,
    draftStartRecordIndex,
    draftEndRecordIndex,
  ]);

  useEffect(() => {
    setActiveEffortId((current) =>
      current !== null && segments.some(({ effort }) => effort.id === current) ? current : null,
    );
  }, [segments]);

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
      setMapReady(true);
      applyAppleDarkBasemapStyle(map);
      addSelectedRouteLayers(map);
      addSegmentOverlayLayers(map);
      updateSelectedRouteData(map, current.points, current.metric);
      const segmentState = segmentOverlayStateRef.current;
      updateSegmentOverlayData(
        map,
        segmentState.points,
        segmentState.visibleSegments,
        segmentState.activeEffortId,
        segmentState.segmentMode ? segmentState.draftStartRecordIndex : null,
        segmentState.segmentMode ? segmentState.draftEndRecordIndex : null,
      );
      fitMapToPoints(map, current.points, { padding: 48 });
    });

    return () => {
      loadedRef.current = false;
      setMapReady(false);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    updateSegmentOverlayData(
      map,
      points,
      visibleSegments,
      activeEffortId,
      segmentMode ? draftStartRecordIndex : null,
      segmentMode ? draftEndRecordIndex : null,
    );
  }, [
    points,
    visibleSegments,
    activeEffortId,
    segmentMode,
    draftStartRecordIndex,
    draftEndRecordIndex,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !segmentMode) return;

    const handleClick = (event: MapMouseEvent) => {
      const nearest = findNearestRoutePoint(points, event.lngLat.lng, event.lngLat.lat);
      if (!nearest) return;

      if (draftStartRecordIndex === null) {
        setDraftStartRecordIndex(nearest.recordIndex);
        return;
      }

      if (draftEndRecordIndex === null) {
        setDraftEndRecordIndex(nearest.recordIndex);
        return;
      }

      const startDistance = Math.abs(nearest.recordIndex - draftStartRecordIndex);
      const endDistance = Math.abs(nearest.recordIndex - draftEndRecordIndex);
      if (startDistance <= endDistance) {
        setDraftStartRecordIndex(nearest.recordIndex);
      } else {
        setDraftEndRecordIndex(nearest.recordIndex);
      }
    };

    map.on("click", handleClick);
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      map.getCanvas().style.cursor = "";
    };
  }, [points, segmentMode, draftStartRecordIndex, draftEndRecordIndex]);

  const resetDraft = () => {
    setDraftStartRecordIndex(null);
    setDraftEndRecordIndex(null);
    setDraftName("");
  };

  const handleToggleSegmentMode = () => {
    setSegmentMode((current) => {
      if (current) {
        setEditingSegmentId(null);
        resetDraft();
      }
      return !current;
    });
  };

  const handleEditSegment = (segment: ActivitySegment) => {
    setEditingSegmentId(segment.segment.id);
    setDraftName(segment.segment.name);
    setDraftStartRecordIndex(segment.segment.startRecordIndex);
    setDraftEndRecordIndex(segment.segment.endRecordIndex);
    setActiveEffortId(segment.effort.id);
    setShowSegments(true);
    setSegmentMode(true);
  };

  const handleSaveDraft = async () => {
    if (!canSaveDraft || draftStartRecordIndex === null || draftEndRecordIndex === null) return;

    const payload = {
      name: draftName.trim(),
      startRecordIndex: Math.min(draftStartRecordIndex, draftEndRecordIndex),
      endRecordIndex: Math.max(draftStartRecordIndex, draftEndRecordIndex),
    };

    if (editingSegmentId === null) {
      await onCreateSegment(payload);
    } else {
      await onUpdateSegment(editingSegmentId, payload);
    }

    resetDraft();
    setEditingSegmentId(null);
    setSegmentMode(false);
    setShowSegments(true);
  };

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
        <div
          className={[
            "relative aspect-[1.25] min-h-[420px] overflow-hidden border bg-[#20252c] transition-colors max-[900px]:aspect-[0.82] max-[900px]:h-auto max-[900px]:min-h-[360px]",
            segmentMode
              ? "border-ride-amber shadow-[0_0_0_2px_rgba(255,199,44,0.22)]"
              : "border-[#343a43]",
          ].join(" ")}
        >
          <div className="absolute top-3 left-3 z-[2] flex max-w-[calc(100%-88px)] flex-wrap gap-1.5 max-[900px]:right-3 max-[900px]:max-w-none">
            <div className="flex flex-wrap gap-1.5" aria-label="Route metric">
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
            <button
              type="button"
              className={segmentButtonClassName(segmentMode)}
              disabled={creatingSegment}
              onClick={handleToggleSegmentMode}
            >
              {segmentMode ? "Cancel segment" : "Create segment"}
            </button>
            {segments.length > 0 ? (
              <button
                type="button"
                className={segmentButtonClassName(showSegments)}
                onClick={() => setShowSegments((current) => !current)}
              >
                Segments {segments.length}
              </button>
            ) : null}
          </div>
          <div className="!absolute !inset-0" ref={containerRef} />
          {replay.enabled && !segmentMode ? null : <MapLegend metric={metric} points={points} />}

          {segmentMode ? (
            <div className="absolute right-3 bottom-3 z-[2] w-[min(360px,calc(100%-24px))] border border-ride-amber bg-[#12171d]/95 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.32)] backdrop-blur">
              <div className="mb-2 font-ride text-[11px] font-bold uppercase text-ride-amber">
                {editingSegmentId === null ? "Create segment" : "Edit segment"}
              </div>
              <label
                className="mb-1 block font-ride text-[9px] font-bold uppercase text-ride-ink-dim"
                htmlFor="segment-name"
              >
                Segment name
              </label>
              <input
                id="segment-name"
                className="mb-2 w-full border border-ride-line bg-ride-night-2 px-2.5 py-2 font-ride text-xs text-ride-ink outline-none focus:border-ride-amber"
                value={draftName}
                placeholder="Name this segment"
                onChange={(event) => setDraftName(event.currentTarget.value)}
              />
              <div className="grid grid-cols-3 gap-px border border-ride-line bg-ride-line-soft text-xs">
                <SegmentPreviewCell
                  label="Distance"
                  value={formatDistance(draftStats.distanceMeters)}
                />
                <SegmentPreviewCell
                  label="Elapsed"
                  value={formatDuration(draftStats.elapsedSeconds)}
                />
                <SegmentPreviewCell
                  label="Avg speed"
                  value={formatSpeed(draftStats.averageSpeedMetersPerSecond)}
                />
                <SegmentPreviewCell
                  label="Heart rate"
                  value={formatBpm(draftStats.averageHeartRateBpm)}
                />
                <SegmentPreviewCell
                  label="Climbing"
                  value={`${formatElevation(draftStats.elevationGainMeters)} m`}
                />
                <SegmentPreviewCell
                  label="Bounds"
                  value={formatBounds(draftStartRecordIndex, draftEndRecordIndex)}
                />
              </div>
              {segmentError ? (
                <div className="mt-2 text-xs text-[#e6a59d]">{segmentError}</div>
              ) : null}
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  className={segmentButtonClassName(false)}
                  onClick={resetDraft}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={segmentButtonClassName(true)}
                  disabled={!canSaveDraft || creatingSegment}
                  onClick={() => void handleSaveDraft()}
                >
                  {creatingSegment
                    ? "Saving"
                    : editingSegmentId === null
                      ? "Save segment"
                      : "Update segment"}
                </button>
              </div>
            </div>
          ) : null}

          {!segmentMode && showSegments && activeSegment ? (
            <div className="absolute right-3 bottom-[112px] z-[2] w-[min(340px,calc(100%-24px))] border border-ride-line bg-[#12171d]/95 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.32)] backdrop-blur max-[900px]:bottom-[190px]">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 font-ride text-[11px] font-bold uppercase text-ride-ink">
                  {activeSegment.segment.name}
                </div>
                <div className="flex shrink-0 gap-2">
                  {activeSegment.effort.source === "source" ? (
                    <button
                      type="button"
                      className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim hover:text-ride-amber"
                      onClick={() => handleEditSegment(activeSegment)}
                    >
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim hover:text-ride-amber"
                    onClick={() => setActiveEffortId(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px border border-ride-line bg-ride-line-soft text-xs">
                <SegmentPreviewCell
                  label="Distance"
                  value={formatDistance(activeSegment.effort.stats.distanceMeters)}
                />
                <SegmentPreviewCell
                  label="Elapsed"
                  value={formatDuration(activeSegment.effort.stats.elapsedSeconds)}
                />
                <SegmentPreviewCell
                  label="Avg speed"
                  value={formatSpeed(activeSegment.effort.stats.averageSpeedMetersPerSecond)}
                />
                <SegmentPreviewCell
                  label="Heart rate"
                  value={formatBpm(activeSegment.effort.stats.averageHeartRateBpm)}
                />
                <SegmentPreviewCell
                  label="Climbing"
                  value={`${formatElevation(activeSegment.effort.stats.elevationGainMeters)} m`}
                />
                <SegmentPreviewCell
                  label="Confidence"
                  value={`${Math.round(activeSegment.effort.confidence * 100)}%`}
                />
              </div>
            </div>
          ) : null}

          {!segmentMode && showSegments && segments.length > 0 ? (
            <div className="absolute bottom-[112px] left-3 z-[2] flex max-w-[calc(100%-390px)] flex-wrap gap-1.5 max-[900px]:right-3 max-[900px]:bottom-[190px] max-[900px]:max-w-none">
              {segments.map(({ effort, segment }) => (
                <button
                  key={effort.id}
                  type="button"
                  className={segmentButtonClassName(effort.id === activeEffortId)}
                  onClick={() => setActiveEffortId(effort.id)}
                >
                  {segment.name}
                </button>
              ))}
            </div>
          ) : null}
          <ReplayMapControls replay={replay} hidden={segmentMode} />
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

function SegmentPreviewCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 bg-ride-abyss px-2 py-2">
      <div className="font-ride text-[9px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className="mt-1 truncate font-ride-mono text-[12px] text-ride-ink">{value}</div>
    </div>
  );
}

function segmentButtonClassName(active: boolean): string {
  return [
    "border px-2.5 py-1.5 font-ride text-[10px] font-bold uppercase transition-colors disabled:cursor-default disabled:opacity-50",
    active
      ? "border-ride-amber bg-ride-amber text-[#15120a]"
      : "border-ride-line bg-[#12171d]/90 text-ride-ink hover:border-ride-amber hover:text-ride-amber",
  ].join(" ");
}

function computeDraftSegmentStats(
  records: ReadonlyArray<ActivityRecord>,
  startRecordIndex: number | null,
  endRecordIndex: number | null,
) {
  if (startRecordIndex === null || endRecordIndex === null || startRecordIndex === endRecordIndex) {
    return emptyDraftStats;
  }

  const start = Math.min(startRecordIndex, endRecordIndex);
  const end = Math.max(startRecordIndex, endRecordIndex);
  const range = records.filter(
    (record) => record.recordIndex >= start && record.recordIndex <= end,
  );
  const first = range[0];
  const last = range.at(-1);
  const distanceMeters =
    first?.distanceMeters !== null &&
    first?.distanceMeters !== undefined &&
    last?.distanceMeters !== null &&
    last?.distanceMeters !== undefined
      ? Math.max(0, last.distanceMeters - first.distanceMeters)
      : null;
  const elapsedSeconds =
    first?.timestamp && last?.timestamp
      ? Math.max(0, (Date.parse(last.timestamp) - Date.parse(first.timestamp)) / 1000)
      : null;
  const heartRates = range.flatMap((record) =>
    record.heartRateBpm === null ? [] : [record.heartRateBpm],
  );
  const elevationGainMeters = range.reduce((gain, record, index) => {
    const previous = range[index - 1];
    if (!previous || previous.altitudeMeters === null || record.altitudeMeters === null)
      return gain;
    return gain + Math.max(0, record.altitudeMeters - previous.altitudeMeters);
  }, 0);

  return {
    distanceMeters,
    elapsedSeconds,
    averageSpeedMetersPerSecond:
      distanceMeters !== null && elapsedSeconds !== null && elapsedSeconds > 0
        ? distanceMeters / elapsedSeconds
        : null,
    averageHeartRateBpm:
      heartRates.length === 0
        ? null
        : heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length,
    elevationGainMeters: range.length > 1 ? elevationGainMeters : null,
  };
}

const emptyDraftStats = {
  distanceMeters: null,
  elapsedSeconds: null,
  averageSpeedMetersPerSecond: null,
  averageHeartRateBpm: null,
  elevationGainMeters: null,
};

function formatBounds(startRecordIndex: number | null, endRecordIndex: number | null): string {
  if (startRecordIndex === null && endRecordIndex === null) return "Pick start";
  if (startRecordIndex !== null && endRecordIndex === null) return "Pick finish";
  if (startRecordIndex === null || endRecordIndex === null) return "--";
  return `${Math.min(startRecordIndex, endRecordIndex)}-${Math.max(startRecordIndex, endRecordIndex)}`;
}

function findNearestRoutePoint(
  points: ReadonlyArray<ActivityRoutePoint>,
  longitude: number,
  latitude: number,
): ActivityRoutePoint | null {
  let nearest: ActivityRoutePoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = haversineMeters(latitude, longitude, point.latitude, point.longitude);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function haversineMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const phiA = toRadians(latitudeA);
  const phiB = toRadians(latitudeB);
  const deltaPhi = toRadians(latitudeB - latitudeA);
  const deltaLambda = toRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(deltaPhi / 2) ** 2 + Math.cos(phiA) * Math.cos(phiB) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
