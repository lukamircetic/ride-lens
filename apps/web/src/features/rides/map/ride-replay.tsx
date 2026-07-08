import type { ActivityDetailResponse } from "@ride-lens/api";
import { cn } from "@ride-lens/ui/lib/utils";
import NumberFlow, { type Format } from "@number-flow/react";
import { CompassIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { Liveline, type LivelinePoint } from "liveline";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  formatBpm,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
  formatWindDirection,
  formatWindSpeed,
} from "../formatters";
import type { ActivityRecord } from "../types";
import { addReplayLayers, updateReplayLayerData } from "./layers";

type WeatherSummary = ActivityDetailResponse["weather"];

type ReplayViewMode = "2d" | "3d";
type ReplayCameraMode = "static" | "follow" | "rotate";

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

interface ReplayFrame {
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

export function useRideReplay({
  map,
  records,
  weather,
}: {
  readonly map: MapLibreMap | null;
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly weather: WeatherSummary;
}) {
  const samples = useMemo(() => buildReplaySamples(records), [records]);
  const durationSeconds = samples.at(-1)?.elapsedSeconds ?? 0;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(8);
  const [viewMode, setViewMode] = useState<ReplayViewMode>("2d");
  const [cameraMode, setCameraMode] = useState<ReplayCameraMode>("static");
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const lastCameraUpdateRef = useRef(0);
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

    if (viewMode === "3d") {
      map.easeTo({
        bearing: frame.headingDegrees === null ? map.getBearing() : frame.headingDegrees - 90,
        center: [...frame.coordinate],
        duration: 140,
        pitch: 64,
        zoom: Math.max(map.getZoom(), 15.2),
      });
      return;
    }

    if (cameraMode === "static") {
      if (map.getPitch() !== 0) {
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
  }, [cameraMode, frame.coordinate, frame.headingDegrees, map, viewMode]);

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
    viewMode,
    weather,
    reset: () => {
      setPlaying(false);
      setElapsedSeconds(0);
    },
    seek: (progress: number) => {
      setElapsedSeconds(clamp(progress, 0, 1) * durationSeconds);
    },
    setCameraMode,
    setSpeedMultiplier,
    setViewMode,
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

export function ReplayMapBadge({
  frame,
  weather,
}: {
  readonly frame: ReplayFrame;
  readonly weather: WeatherSummary;
}) {
  if (frame.coordinate === null) return null;

  return (
    <div className="absolute top-[54px] right-[52px] z-[2] grid w-[min(260px,calc(100%-76px))] grid-cols-2 border border-ride-ink/20 bg-[#12171d]/90 text-ride-ink shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur max-[900px]:top-auto max-[900px]:right-3 max-[900px]:bottom-[86px] max-[900px]:w-[min(260px,calc(100%-24px))]">
      <MapBadgeCell
        iconRotation={weather?.dominantWindDirectionDegrees ?? null}
        label="Wind"
        value={formatWindSpeed(weather?.averageWindSpeedMetersPerSecond ?? null)}
        subValue={formatWindDirection(weather?.dominantWindDirectionDegrees ?? null)}
      />
      <MapBadgeCell
        iconRotation={frame.headingDegrees}
        label="Heading"
        value={formatBearing(frame.headingDegrees)}
        subValue={formatWindDirection(frame.headingDegrees)}
      />
    </div>
  );
}

export function ReplayControlPanel({
  replay,
  hidden,
}: {
  readonly replay: ReturnType<typeof useRideReplay>;
  readonly hidden: boolean;
}) {
  if (!replay.hasReplay || hidden) return null;

  return (
    <div className="mt-2.5 border border-ride-line bg-ride-abyss">
      <div className="grid grid-cols-[minmax(260px,0.78fr)_minmax(360px,1.22fr)] gap-px bg-ride-line-soft max-[900px]:grid-cols-1">
        <div className="bg-ride-abyss p-3">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="font-ride text-[11px] font-bold uppercase text-ride-ink-muted">
                Replay
              </div>
              <div className="mt-0.5 font-ride-mono text-[11px] text-ride-ink-dim">
                {formatDuration(replay.elapsedSeconds)} / {formatDuration(replay.durationSeconds)}
              </div>
            </div>
            <div className="flex gap-1.5">
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
            </div>
          </div>

          <input
            className="w-full accent-ride-amber"
            type="range"
            min={0}
            max={1000}
            value={Math.round(replay.progress * 1000)}
            aria-label="Replay position"
            onChange={(event) => replay.seek(Number(event.currentTarget.value) / 1000)}
          />

          <div className="mt-3 grid grid-cols-3 gap-px border border-ride-line-soft bg-ride-line-soft">
            {[1, 4, 8, 16, 32].map((speed) => (
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

          <div className="mt-2 grid grid-cols-3 gap-px border border-ride-line-soft bg-ride-line-soft">
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

          <div className="mt-2 grid grid-cols-2 gap-px border border-ride-line-soft bg-ride-line-soft">
            <button
              type="button"
              className={replayButtonClassName(replay.viewMode === "2d")}
              onClick={() => replay.setViewMode("2d")}
            >
              2D
            </button>
            <button
              type="button"
              className={replayButtonClassName(replay.viewMode === "3d")}
              onClick={() => replay.setViewMode("3d")}
            >
              3D side
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-ride-line-soft max-[900px]:grid-cols-1">
          <ReplayMetricCard
            label="Speed"
            color="#ffc72c"
            value={replay.speedChart.value}
            data={replay.speedChart.data}
            chartWindowSeconds={replay.chartWindowSeconds}
            format={(value) => `${value.toFixed(1)} km/h`}
            numberFormat={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            suffix=" km/h"
          />
          <ReplayMetricCard
            label="Elevation"
            color="#78b7c8"
            value={replay.elevationChart.value}
            data={replay.elevationChart.data}
            chartWindowSeconds={replay.chartWindowSeconds}
            format={(value) => `${Math.round(value)} m`}
            numberFormat={{ maximumFractionDigits: 0 }}
            suffix=" m"
          />
          <ReplayMetricCard
            label="Heart rate"
            color="#ff5a5f"
            value={replay.heartRateChart.value}
            data={replay.heartRateChart.data}
            chartWindowSeconds={replay.chartWindowSeconds}
            format={(value) => `${Math.round(value)} bpm`}
            numberFormat={{ maximumFractionDigits: 0 }}
            suffix=" bpm"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-px border-t border-ride-line bg-ride-line-soft max-[900px]:grid-cols-2">
        <ReplayStaticCell label="Distance" value={formatDistance(replay.frame.distanceMeters)} />
        <ReplayStaticCell
          label="Current speed"
          value={formatSpeed(replay.frame.speedMetersPerSecond)}
        />
        <ReplayStaticCell label="Heart rate" value={formatBpm(replay.frame.heartRateBpm)} />
        <ReplayStaticCell
          label="Climbing"
          value={`${formatElevation(replay.frame.altitudeMeters)} m`}
        />
      </div>
    </div>
  );
}

function ReplayMetricCard({
  label,
  color,
  value,
  data,
  chartWindowSeconds,
  format,
  numberFormat,
  suffix,
}: {
  readonly label: string;
  readonly color: string;
  readonly value: number | null;
  readonly data: ReadonlyArray<LivelinePoint>;
  readonly chartWindowSeconds: number;
  readonly format: (value: number) => string;
  readonly numberFormat: Format;
  readonly suffix: string;
}) {
  const displayValue = value ?? 0;

  return (
    <div className="min-w-0 bg-ride-abyss p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">{label}</span>
        <b className="font-ride-mono text-[18px] font-semibold text-ride-ink">
          {value === null ? (
            "n/a"
          ) : (
            <NumberFlow value={displayValue} format={numberFormat} suffix={suffix} />
          )}
        </b>
      </div>
      <div className="mt-2 h-[92px] min-w-0">
        <Liveline
          badge={false}
          color={color}
          data={[...data]}
          emptyText="No data"
          exaggerate
          fill
          formatValue={format}
          grid={false}
          lineWidth={2}
          momentum={false}
          pulse={false}
          scrub={false}
          theme="dark"
          value={displayValue}
          window={chartWindowSeconds}
        />
      </div>
    </div>
  );
}

function ReplayStaticCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 bg-ride-abyss px-3 py-2">
      <div className="font-ride text-[9px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className="mt-0.5 truncate font-ride-mono text-[12px] text-ride-ink-muted">{value}</div>
    </div>
  );
}

function MapBadgeCell({
  label,
  value,
  subValue,
  iconRotation,
}: {
  readonly label: string;
  readonly value: string;
  readonly subValue: string;
  readonly iconRotation: number | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-ride-line-soft px-2.5 py-2 last:border-r-0">
      <CompassIcon
        className="size-[18px] shrink-0 text-ride-amber"
        style={{ transform: iconRotation === null ? undefined : `rotate(${iconRotation}deg)` }}
      />
      <div className="min-w-0">
        <div className="font-ride text-[8px] font-bold uppercase text-ride-ink-dim">{label}</div>
        <div className="truncate font-ride-mono text-[11px] text-ride-ink">{value}</div>
        <div className="font-ride-mono text-[10px] text-ride-ink-dim">{subValue}</div>
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
  const data = samples.slice(0, frame.sampleIndex + 1).flatMap((sample): Array<LivelinePoint> => {
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

function formatBearing(value: number | null) {
  return value === null ? "n/a" : `${Math.round(normalizeDegrees(value))} deg`;
}

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number) {
  return radians * (180 / Math.PI);
}
