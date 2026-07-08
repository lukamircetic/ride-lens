import { cn } from "@ride-lens/ui/lib/utils";
import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatDuration } from "../formatters";
import type { ActivityRecord } from "../types";
import { addReplayLayers, updateReplayLayerData } from "./layers";

type ReplayCameraMode = "static" | "follow" | "rotate";
const speedMultipliers = [8, 16, 32, 64, 128] as const;

interface ReplaySample {
  readonly recordIndex: number;
  readonly elapsedSeconds: number;
  readonly longitude: number;
  readonly latitude: number;
  readonly distanceMeters: number | null;
  readonly speedMetersPerSecond: number | null;
  readonly heartRateBpm: number | null;
  readonly altitudeMeters: number | null;
}

interface MetricChartPoint {
  readonly time: number;
  readonly value: number;
}

export interface ReplayFrame {
  readonly elapsedSeconds: number;
  readonly durationSeconds: number;
  readonly sampleIndex: number;
  readonly coordinate: readonly [number, number] | null;
  readonly headingCoordinate: readonly [number, number] | null;
  readonly headingDegrees: number | null;
  readonly trailCoordinates: ReadonlyArray<readonly [number, number]>;
  readonly distanceMeters: number | null;
  readonly speedMetersPerSecond: number | null;
  readonly heartRateBpm: number | null;
  readonly altitudeMeters: number | null;
}

export function useRideReplay({ records }: { readonly records: ReadonlyArray<ActivityRecord> }) {
  const samples = useMemo(() => buildReplaySamples(records), [records]);
  const durationSeconds = samples.at(-1)?.elapsedSeconds ?? 0;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(64);
  const [cameraMode, setCameraMode] = useState<ReplayCameraMode>("static");
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const frame = useMemo(
    () => buildReplayFrame(samples, clamp(elapsedSeconds, 0, durationSeconds)),
    [elapsedSeconds, durationSeconds, samples],
  );

  useEffect(() => {
    setElapsedSeconds(0);
    setPlaying(false);
  }, [records]);

  useEffect(() => {
    if (elapsedSeconds <= durationSeconds) return;
    setElapsedSeconds(durationSeconds);
  }, [durationSeconds, elapsedSeconds]);

  useEffect(() => {
    if (!playing || durationSeconds <= 0) return;

    const tick = (now: number) => {
      const previousTick = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const deltaSeconds = ((now - previousTick) / 1000) * speedMultiplier;

      setElapsedSeconds((current) => {
        const next = current + deltaSeconds;
        if (next >= durationSeconds) {
          setPlaying(false);
          return durationSeconds;
        }
        return next;
      });

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastTickRef.current = null;
    };
  }, [durationSeconds, playing, speedMultiplier]);

  const chartWindowSeconds = Math.max(30, durationSeconds || 30);
  const speedChart = useMemo(
    () =>
      buildMetricChart(samples, frame, (sample) =>
        sample.speedMetersPerSecond === null ? null : sample.speedMetersPerSecond * 3.6,
      ),
    [frame, samples],
  );
  const elevationChart = useMemo(
    () => buildMetricChart(samples, frame, (sample) => sample.altitudeMeters),
    [frame, samples],
  );
  const heartRateChart = useMemo(
    () => buildMetricChart(samples, frame, (sample) => sample.heartRateBpm),
    [frame, samples],
  );

  const controls = {
    cameraMode,
    chartWindowSeconds,
    durationSeconds,
    elapsedSeconds: frame.elapsedSeconds,
    elevationChart,
    frame,
    hasReplay: samples.length >= 2,
    heartRateChart,
    playing,
    progress: durationSeconds > 0 ? frame.elapsedSeconds / durationSeconds : 0,
    speedChart,
    speedMultiplier,
    reset: () => {
      setPlaying(false);
      setElapsedSeconds(0);
    },
    seek: (progress: number) => {
      setElapsedSeconds(clamp(progress, 0, 1) * durationSeconds);
    },
    setCameraMode,
    setSpeedMultiplier,
    togglePlaying: () => {
      if (durationSeconds <= 0) return;
      setPlaying((current) => {
        if (current) return false;
        if (elapsedSeconds >= durationSeconds) setElapsedSeconds(0);
        return true;
      });
    },
  };

  return controls;
}

export type RideReplay = ReturnType<typeof useRideReplay>;

export function useReplayMapEffects({
  map,
  replay,
}: {
  readonly map: MapLibreMap | null;
  readonly replay: RideReplay;
}) {
  const lastCameraUpdateRef = useRef(0);
  const { cameraMode, frame } = replay;

  useEffect(() => {
    if (!map) return;

    addReplayLayers(map);
    updateReplayLayerData(map, frame.trailCoordinates, frame.coordinate, frame.headingCoordinate);
  }, [frame.coordinate, frame.headingCoordinate, frame.trailCoordinates, map]);

  useEffect(() => {
    if (!map || frame.coordinate === null) return;

    const now = performance.now();
    if (now - lastCameraUpdateRef.current < 160) return;
    lastCameraUpdateRef.current = now;

    if (cameraMode === "static") {
      if (map.getPitch() !== 0 || map.getBearing() !== 0) {
        map.easeTo({ bearing: 0, duration: 260, pitch: 0 });
      }
      return;
    }

    map.easeTo({
      bearing: cameraMode === "rotate" && frame.headingDegrees !== null ? frame.headingDegrees : 0,
      center: [...frame.coordinate],
      duration: 140,
      pitch: 0,
      zoom: Math.max(map.getZoom(), 14.5),
    });
  }, [cameraMode, frame.coordinate, frame.headingDegrees, map]);
}

export function ReplayMapControls({
  replay,
  hidden,
}: {
  readonly replay: RideReplay;
  readonly hidden: boolean;
}) {
  if (!replay.hasReplay || hidden) return null;

  return (
    <div className="absolute bottom-3 left-3 z-[2] w-[min(330px,calc(100%-24px))] border border-ride-line bg-ride-line-soft shadow-[0_16px_38px_rgba(0,0,0,0.36)]">
      <div className="bg-[#10161c]/96 p-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className={iconButtonClassName(true)}
            aria-label={replay.playing ? "Pause replay" : "Play replay"}
            onClick={replay.togglePlaying}
          >
            {replay.playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className={iconButtonClassName(false)}
            aria-label="Reset replay"
            onClick={replay.reset}
          >
            <RotateCcwIcon />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-ride text-[10px] font-bold uppercase text-ride-ink-muted">
                Replay
              </span>
              <span className="font-ride-mono text-[10px] text-ride-ink-dim">
                {formatDuration(replay.elapsedSeconds)} / {formatDuration(replay.durationSeconds)}
              </span>
            </div>
            <input
              className="mt-1 block w-full accent-ride-amber"
              type="range"
              min={0}
              max={1000}
              value={Math.round(replay.progress * 1000)}
              aria-label="Replay position"
              onChange={(event) => replay.seek(Number(event.currentTarget.value) / 1000)}
            />
          </div>
        </div>

        <div className="mt-2 grid gap-px bg-ride-line-soft">
          <div className="grid grid-cols-5 gap-px">
            {speedMultipliers.map((speed) => (
              <button
                key={speed}
                type="button"
                className={replayButtonClassName(replay.speedMultiplier === speed)}
                onClick={() => replay.setSpeedMultiplier(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-px">
            <button
              type="button"
              className={replayButtonClassName(replay.cameraMode === "static")}
              onClick={() => replay.setCameraMode("static")}
            >
              Static
            </button>
            <button
              type="button"
              className={replayButtonClassName(replay.cameraMode === "follow")}
              onClick={() => replay.setCameraMode("follow")}
            >
              Follow
            </button>
            <button
              type="button"
              className={replayButtonClassName(replay.cameraMode === "rotate")}
              onClick={() => replay.setCameraMode("rotate")}
            >
              Rotate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function iconButtonClassName(active: boolean): string {
  return cn(
    "grid size-8 cursor-pointer place-items-center border transition-colors disabled:cursor-default disabled:opacity-50 [&_svg]:size-[15px]",
    active
      ? "border-ride-amber bg-ride-amber text-[#15120a]"
      : "border-ride-line bg-[#12171d] text-ride-ink hover:border-ride-amber hover:text-ride-amber",
  );
}

function replayButtonClassName(active: boolean): string {
  return cn(
    "min-h-8 cursor-pointer bg-ride-abyss px-2 py-1.5 font-ride text-[10px] font-bold uppercase transition-colors",
    active ? "text-ride-amber" : "text-ride-ink-dim hover:text-ride-ink",
  );
}

function buildReplaySamples(records: ReadonlyArray<ActivityRecord>): ReadonlyArray<ReplaySample> {
  const source = records.filter(
    (record) =>
      typeof record.latitude === "number" &&
      typeof record.longitude === "number" &&
      Number.isFinite(record.latitude) &&
      Number.isFinite(record.longitude),
  );
  const firstTimestamp = source
    .map((record) => (record.timestamp === null ? null : Date.parse(record.timestamp)))
    .find((timestamp): timestamp is number => timestamp !== null && Number.isFinite(timestamp));
  let previousElapsed = -1;

  return source.map((record, index) => {
    const timestamp = record.timestamp === null ? null : Date.parse(record.timestamp);
    const timestampElapsed =
      firstTimestamp !== undefined && timestamp !== null && Number.isFinite(timestamp)
        ? (timestamp - firstTimestamp) / 1000
        : null;
    const elapsedSeconds =
      timestampElapsed !== null && timestampElapsed > previousElapsed
        ? timestampElapsed
        : previousElapsed + 1;
    previousElapsed = elapsedSeconds;

    return {
      recordIndex: record.recordIndex,
      elapsedSeconds: index === 0 ? 0 : elapsedSeconds,
      longitude: record.longitude!,
      latitude: record.latitude!,
      distanceMeters: record.distanceMeters,
      speedMetersPerSecond: record.speedMetersPerSecond,
      heartRateBpm: record.heartRateBpm,
      altitudeMeters: record.altitudeMeters,
    };
  });
}

function buildReplayFrame(
  samples: ReadonlyArray<ReplaySample>,
  elapsedSeconds: number,
): ReplayFrame {
  const durationSeconds = samples.at(-1)?.elapsedSeconds ?? 0;
  if (samples.length === 0) {
    return emptyReplayFrame(durationSeconds);
  }

  const nextIndex = samples.findIndex((sample) => sample.elapsedSeconds >= elapsedSeconds);
  const boundedNextIndex = nextIndex === -1 ? samples.length - 1 : Math.max(0, nextIndex);
  const next = samples[boundedNextIndex] ?? samples[0]!;
  const previous = samples[Math.max(0, boundedNextIndex - 1)] ?? next;
  const reachedSampleIndex =
    next.elapsedSeconds <= elapsedSeconds ? boundedNextIndex : Math.max(0, boundedNextIndex - 1);
  const span = Math.max(0.00001, next.elapsedSeconds - previous.elapsedSeconds);
  const ratio =
    next === previous ? 0 : clamp((elapsedSeconds - previous.elapsedSeconds) / span, 0, 1);
  const longitude = interpolate(previous.longitude, next.longitude, ratio);
  const latitude = interpolate(previous.latitude, next.latitude, ratio);
  const coordinate = [longitude, latitude] as const;
  const headingDegrees = bearingDegrees(
    previous.latitude,
    previous.longitude,
    next.latitude,
    next.longitude,
  );
  const headingCoordinate =
    headingDegrees === null
      ? null
      : destinationCoordinate(latitude, longitude, headingDegrees, 180);
  const trailCoordinates = [
    ...samples
      .slice(0, Math.max(1, reachedSampleIndex + 1))
      .map((sample) => [sample.longitude, sample.latitude] as const),
    coordinate,
  ];

  return {
    elapsedSeconds,
    durationSeconds,
    sampleIndex: reachedSampleIndex,
    coordinate,
    headingCoordinate,
    headingDegrees,
    trailCoordinates,
    distanceMeters: interpolateNullable(previous.distanceMeters, next.distanceMeters, ratio),
    speedMetersPerSecond: interpolateNullable(
      previous.speedMetersPerSecond,
      next.speedMetersPerSecond,
      ratio,
    ),
    heartRateBpm: interpolateNullable(previous.heartRateBpm, next.heartRateBpm, ratio),
    altitudeMeters: interpolateNullable(previous.altitudeMeters, next.altitudeMeters, ratio),
  };
}

function emptyReplayFrame(durationSeconds: number): ReplayFrame {
  return {
    elapsedSeconds: 0,
    durationSeconds,
    sampleIndex: 0,
    coordinate: null,
    headingCoordinate: null,
    headingDegrees: null,
    trailCoordinates: [],
    distanceMeters: null,
    speedMetersPerSecond: null,
    heartRateBpm: null,
    altitudeMeters: null,
  };
}

function buildMetricChart(
  samples: ReadonlyArray<ReplaySample>,
  frame: ReplayFrame,
  getValue: (sample: ReplaySample) => number | null,
) {
  const data = samples
    .slice(0, frame.sampleIndex + 1)
    .flatMap((sample): Array<MetricChartPoint> => {
      const value = getValue(sample);
      return value === null || !Number.isFinite(value)
        ? []
        : [{ time: sample.elapsedSeconds, value }];
    });
  const currentValue = currentMetricValue(frame, getValue);

  if (currentValue !== null) {
    const last = data.at(-1);
    if (!last || last.time !== frame.elapsedSeconds) {
      data.push({ time: frame.elapsedSeconds, value: currentValue });
    }
  }

  return { data, value: currentValue };
}

function currentMetricValue(
  frame: ReplayFrame,
  getValue: (sample: ReplaySample) => number | null,
): number | null {
  const pseudoSample: ReplaySample = {
    recordIndex: frame.sampleIndex,
    elapsedSeconds: frame.elapsedSeconds,
    longitude: frame.coordinate?.[0] ?? 0,
    latitude: frame.coordinate?.[1] ?? 0,
    distanceMeters: frame.distanceMeters,
    speedMetersPerSecond: frame.speedMetersPerSecond,
    heartRateBpm: frame.heartRateBpm,
    altitudeMeters: frame.altitudeMeters,
  };
  const value = getValue(pseudoSample);
  return value === null || !Number.isFinite(value) ? null : value;
}

function interpolateNullable(left: number | null, right: number | null, ratio: number) {
  if (left === null && right === null) return null;
  if (left === null) return right;
  if (right === null) return left;
  return interpolate(left, right, ratio);
}

function interpolate(left: number, right: number, ratio: number) {
  return left + (right - left) * ratio;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function bearingDegrees(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number | null {
  if (latitudeA === latitudeB && longitudeA === longitudeB) return null;

  const phiA = toRadians(latitudeA);
  const phiB = toRadians(latitudeB);
  const lambdaDelta = toRadians(longitudeB - longitudeA);
  const y = Math.sin(lambdaDelta) * Math.cos(phiB);
  const x =
    Math.cos(phiA) * Math.sin(phiB) - Math.sin(phiA) * Math.cos(phiB) * Math.cos(lambdaDelta);
  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

function destinationCoordinate(
  latitude: number,
  longitude: number,
  bearing: number,
  distanceMeters: number,
) {
  const angularDistance = distanceMeters / 6_371_000;
  const theta = toRadians(bearing);
  const phiA = toRadians(latitude);
  const lambdaA = toRadians(longitude);
  const phiB = Math.asin(
    Math.sin(phiA) * Math.cos(angularDistance) +
      Math.cos(phiA) * Math.sin(angularDistance) * Math.cos(theta),
  );
  const lambdaB =
    lambdaA +
    Math.atan2(
      Math.sin(theta) * Math.sin(angularDistance) * Math.cos(phiA),
      Math.cos(angularDistance) - Math.sin(phiA) * Math.sin(phiB),
    );

  return [normalizeLongitude(toDegrees(lambdaB)), toDegrees(phiB)] as const;
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number) {
  return radians * (180 / Math.PI);
}
