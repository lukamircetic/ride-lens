import type { ReplaySample } from "./replay-types";

export function smoothedReplayCoordinate(
  samples: ReadonlyArray<ReplaySample>,
  previousIndex: number,
  nextIndex: number,
  ratio: number,
): readonly [number, number] {
  const previous = samples[previousIndex] ?? samples[0]!;
  const next = samples[nextIndex] ?? previous;
  const beforePrevious = samples[Math.max(0, previousIndex - 1)] ?? previous;
  const afterNext = samples[Math.min(samples.length - 1, nextIndex + 1)] ?? next;
  const longitude = catmullRom(
    beforePrevious.longitude,
    previous.longitude,
    next.longitude,
    afterNext.longitude,
    ratio,
  );
  const latitude = catmullRom(
    beforePrevious.latitude,
    previous.latitude,
    next.latitude,
    afterNext.latitude,
    ratio,
  );

  return [
    Number.isFinite(longitude) ? longitude : interpolate(previous.longitude, next.longitude, ratio),
    Number.isFinite(latitude) ? latitude : interpolate(previous.latitude, next.latitude, ratio),
  ] as const;
}

export function smoothedHeadingDegrees(
  samples: ReadonlyArray<ReplaySample>,
  elapsedSeconds: number,
  coordinate: readonly [number, number],
  previous: ReplaySample,
  next: ReplaySample,
): number | null {
  const lookDistanceSeconds = Math.max(1, (next.elapsedSeconds - previous.elapsedSeconds) * 0.35);
  const durationSeconds = samples.at(-1)?.elapsedSeconds ?? elapsedSeconds;
  const lookaheadCoordinate = smoothedCoordinateAtElapsed(
    samples,
    Math.min(durationSeconds, elapsedSeconds + lookDistanceSeconds),
  );
  const lookaheadBearing = bearingBetweenCoordinates(coordinate, lookaheadCoordinate);
  if (lookaheadBearing !== null) return lookaheadBearing;

  const lookbehindCoordinate = smoothedCoordinateAtElapsed(
    samples,
    Math.max(0, elapsedSeconds - lookDistanceSeconds),
  );
  const lookbehindBearing = bearingBetweenCoordinates(lookbehindCoordinate, coordinate);
  if (lookbehindBearing !== null) return lookbehindBearing;

  return bearingDegrees(previous.latitude, previous.longitude, next.latitude, next.longitude);
}

function smoothedCoordinateAtElapsed(
  samples: ReadonlyArray<ReplaySample>,
  elapsedSeconds: number,
): readonly [number, number] | null {
  if (samples.length === 0) return null;

  const nextIndex = samples.findIndex((sample) => sample.elapsedSeconds >= elapsedSeconds);
  const boundedNextIndex = nextIndex === -1 ? samples.length - 1 : Math.max(0, nextIndex);
  const next = samples[boundedNextIndex] ?? samples[0]!;
  const previousIndex = Math.max(0, boundedNextIndex - 1);
  const previous = samples[previousIndex] ?? next;
  const span = Math.max(0.00001, next.elapsedSeconds - previous.elapsedSeconds);
  const ratio =
    next === previous ? 0 : clamp((elapsedSeconds - previous.elapsedSeconds) / span, 0, 1);

  return smoothedReplayCoordinate(samples, previousIndex, boundedNextIndex, ratio);
}

function bearingBetweenCoordinates(
  from: readonly [number, number] | null,
  to: readonly [number, number] | null,
): number | null {
  if (from === null || to === null) return null;
  return bearingDegrees(from[1], from[0], to[1], to[0]);
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

function catmullRom(p0: number, p1: number, p2: number, p3: number, ratio: number) {
  const t = clamp(ratio, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function interpolate(left: number, right: number, ratio: number) {
  return left + (right - left) * ratio;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
