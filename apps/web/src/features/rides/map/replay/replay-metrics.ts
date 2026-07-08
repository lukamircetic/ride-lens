import type { ActivityRecord } from "../../types";
import { smoothedHeadingDegrees, smoothedReplayCoordinate } from "./replay-geometry";
import type { MetricChartPoint, ReplayFrame, ReplaySample } from "./replay-types";

export function buildReplaySamples(
  records: ReadonlyArray<ActivityRecord>,
): ReadonlyArray<ReplaySample> {
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

export function buildReplayFrame(
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
  const previousIndex = Math.max(0, boundedNextIndex - 1);
  const previous = samples[previousIndex] ?? next;
  const reachedSampleIndex =
    next.elapsedSeconds <= elapsedSeconds ? boundedNextIndex : Math.max(0, boundedNextIndex - 1);
  const span = Math.max(0.00001, next.elapsedSeconds - previous.elapsedSeconds);
  const ratio =
    next === previous ? 0 : clamp((elapsedSeconds - previous.elapsedSeconds) / span, 0, 1);
  const coordinate = smoothedReplayCoordinate(samples, previousIndex, boundedNextIndex, ratio);
  const headingDegrees = smoothedHeadingDegrees(
    samples,
    elapsedSeconds,
    coordinate,
    previous,
    next,
  );
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

export function buildMetricChart(
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

function emptyReplayFrame(durationSeconds: number): ReplayFrame {
  return {
    elapsedSeconds: 0,
    durationSeconds,
    sampleIndex: 0,
    coordinate: null,
    headingDegrees: null,
    trailCoordinates: [],
    distanceMeters: null,
    speedMetersPerSecond: null,
    heartRateBpm: null,
    altitudeMeters: null,
  };
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
