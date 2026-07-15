export type HeartRateZoneMethod = "percentMax" | "heartRateReserve" | "custom";

export type HeartRateZoneNumber = 1 | 2 | 3 | 4 | 5;

export interface HeartRateZoneProfileValues {
  readonly method: HeartRateZoneMethod;
  readonly maximumHeartRateBpm: number | null;
  readonly restingHeartRateBpm: number | null;
  readonly customLowerBoundsBpm: ReadonlyArray<number> | null;
}

export interface HeartRateZone {
  readonly number: HeartRateZoneNumber;
  readonly name: string;
  readonly lowerBpm: number;
  readonly upperBpm: number | null;
}

export interface HeartRateSample {
  readonly timestampMs: number | null;
  readonly heartRateBpm: number | null;
}

export interface HeartRateZoneTime extends HeartRateZone {
  readonly seconds: number;
  readonly share: number;
}

export interface HeartRateZoneDistribution {
  readonly totalTimerSeconds: number;
  readonly classifiedSeconds: number;
  readonly unclassifiedSeconds: number;
  readonly belowZoneSeconds: number;
  readonly belowZoneShare: number;
  readonly coverageRatio: number;
  readonly zones: ReadonlyArray<HeartRateZoneTime>;
}

export const HEART_RATE_ZONE_NAMES = [
  "Recovery",
  "Endurance",
  "Tempo",
  "Threshold",
  "Maximum",
] as const;

const STANDARD_LOWER_BOUND_SHARES = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
const MAX_INTERVAL_SECONDS = 30;

export function estimateMaximumHeartRate(ageYears: number): number {
  if (!Number.isFinite(ageYears) || ageYears < 10 || ageYears > 100) {
    throw new RangeError("Age must be between 10 and 100 years");
  }

  return Math.round(208 - 0.7 * ageYears);
}

export function resolveHeartRateZones(
  profile: HeartRateZoneProfileValues,
): ReadonlyArray<HeartRateZone> {
  const lowerBounds = resolveLowerBounds(profile);

  return lowerBounds.map((lowerBpm, index) => ({
    number: (index + 1) as HeartRateZoneNumber,
    name: HEART_RATE_ZONE_NAMES[index]!,
    lowerBpm,
    upperBpm: lowerBounds[index + 1] ?? null,
  }));
}

export function classifyHeartRate(
  heartRateBpm: number,
  zones: ReadonlyArray<HeartRateZone>,
): HeartRateZoneNumber | null {
  if (!Number.isFinite(heartRateBpm) || zones.length === 0) return null;

  for (let index = zones.length - 1; index >= 0; index -= 1) {
    const zone = zones[index];
    if (zone && heartRateBpm >= zone.lowerBpm) return zone.number;
  }

  return null;
}

export function calculateHeartRateZoneDistribution(
  samples: ReadonlyArray<HeartRateSample>,
  zones: ReadonlyArray<HeartRateZone>,
  timerSeconds?: number | null,
): HeartRateZoneDistribution {
  const secondsByZone = zones.map(() => 0);
  let belowZoneSeconds = 0;

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index];
    const next = samples[index + 1];
    if (!current || !next) continue;

    const intervalSeconds = validIntervalSeconds(current.timestampMs, next.timestampMs);
    if (
      intervalSeconds === null ||
      !isFiniteNumber(current.heartRateBpm) ||
      !isFiniteNumber(next.heartRateBpm)
    ) {
      continue;
    }

    const portions = splitIntervalAtBoundaries(
      current.heartRateBpm,
      next.heartRateBpm,
      zones.map(({ lowerBpm }) => lowerBpm),
    );

    for (const portion of portions) {
      const seconds = intervalSeconds * (portion.endRatio - portion.startRatio);
      const heartRateAtMidpoint = interpolate(
        current.heartRateBpm,
        next.heartRateBpm,
        (portion.startRatio + portion.endRatio) / 2,
      );
      const zoneNumber = classifyHeartRate(heartRateAtMidpoint, zones);

      if (zoneNumber === null) {
        belowZoneSeconds += seconds;
      } else {
        secondsByZone[zoneNumber - 1] = (secondsByZone[zoneNumber - 1] ?? 0) + seconds;
      }
    }
  }

  const zoneSeconds = secondsByZone.reduce((sum, seconds) => sum + seconds, 0);
  const classifiedSeconds = belowZoneSeconds + zoneSeconds;
  const validTimerSeconds =
    isFiniteNumber(timerSeconds) && timerSeconds >= 0
      ? Math.max(timerSeconds, classifiedSeconds)
      : classifiedSeconds;
  const coverageRatio =
    validTimerSeconds > 0 ? clamp(classifiedSeconds / validTimerSeconds, 0, 1) : 0;
  const share = (seconds: number) =>
    classifiedSeconds > 0 ? clamp(seconds / classifiedSeconds, 0, 1) : 0;

  return {
    totalTimerSeconds: validTimerSeconds,
    classifiedSeconds,
    unclassifiedSeconds: Math.max(0, validTimerSeconds - classifiedSeconds),
    belowZoneSeconds,
    belowZoneShare: share(belowZoneSeconds),
    coverageRatio,
    zones: zones.map((zone, index) => ({
      ...zone,
      seconds: secondsByZone[index] ?? 0,
      share: share(secondsByZone[index] ?? 0),
    })),
  };
}

export function combineHeartRateZoneDistributions(
  distributions: ReadonlyArray<HeartRateZoneDistribution>,
  zones: ReadonlyArray<HeartRateZone>,
): HeartRateZoneDistribution {
  const totalTimerSeconds = distributions.reduce(
    (sum, distribution) => sum + distribution.totalTimerSeconds,
    0,
  );
  const classifiedSeconds = distributions.reduce(
    (sum, distribution) => sum + distribution.classifiedSeconds,
    0,
  );
  const belowZoneSeconds = distributions.reduce(
    (sum, distribution) => sum + distribution.belowZoneSeconds,
    0,
  );
  const secondsByZone = zones.map((zone) =>
    distributions.reduce(
      (sum, distribution) =>
        sum + (distribution.zones.find(({ number }) => number === zone.number)?.seconds ?? 0),
      0,
    ),
  );
  const share = (seconds: number) =>
    classifiedSeconds > 0 ? clamp(seconds / classifiedSeconds, 0, 1) : 0;

  return {
    totalTimerSeconds,
    classifiedSeconds,
    unclassifiedSeconds: Math.max(0, totalTimerSeconds - classifiedSeconds),
    belowZoneSeconds,
    belowZoneShare: share(belowZoneSeconds),
    coverageRatio: totalTimerSeconds > 0 ? clamp(classifiedSeconds / totalTimerSeconds, 0, 1) : 0,
    zones: zones.map((zone, index) => ({
      ...zone,
      seconds: secondsByZone[index] ?? 0,
      share: share(secondsByZone[index] ?? 0),
    })),
  };
}

function resolveLowerBounds(profile: HeartRateZoneProfileValues): ReadonlyArray<number> {
  if (profile.method === "custom") {
    const bounds = profile.customLowerBoundsBpm;
    if (!bounds || bounds.length !== 5) {
      throw new RangeError("Custom profiles require five lower boundaries");
    }
    assertOrderedHeartRates(bounds);
    return [...bounds];
  }

  const maximum = profile.maximumHeartRateBpm;
  if (!isFiniteNumber(maximum) || maximum <= 0) {
    throw new RangeError("Maximum heart rate is required");
  }

  if (profile.method === "percentMax") {
    return STANDARD_LOWER_BOUND_SHARES.map((percentage) => Math.ceil(maximum * percentage));
  }

  const resting = profile.restingHeartRateBpm;
  if (!isFiniteNumber(resting) || resting <= 0 || resting >= maximum) {
    throw new RangeError("Resting heart rate must be below maximum heart rate");
  }

  const reserve = maximum - resting;
  return STANDARD_LOWER_BOUND_SHARES.map((percentage) => Math.ceil(resting + reserve * percentage));
}

function assertOrderedHeartRates(bounds: ReadonlyArray<number>): void {
  let previous = Number.NEGATIVE_INFINITY;
  for (const bound of bounds) {
    if (!Number.isInteger(bound) || bound <= previous) {
      throw new RangeError("Heart-rate boundaries must be increasing whole numbers");
    }
    previous = bound;
  }
}

function validIntervalSeconds(left: number | null, right: number | null): number | null {
  if (!isFiniteNumber(left) || !isFiniteNumber(right)) return null;
  const seconds = (right - left) / 1000;
  return seconds > 0 && seconds <= MAX_INTERVAL_SECONDS ? seconds : null;
}

function splitIntervalAtBoundaries(
  startHeartRate: number,
  endHeartRate: number,
  boundaries: ReadonlyArray<number>,
): ReadonlyArray<{ readonly startRatio: number; readonly endRatio: number }> {
  if (startHeartRate === endHeartRate) return [{ startRatio: 0, endRatio: 1 }];

  const ratios = [0, 1];
  for (const boundary of boundaries) {
    const ratio = (boundary - startHeartRate) / (endHeartRate - startHeartRate);
    if (ratio > 0 && ratio < 1) ratios.push(ratio);
  }
  ratios.sort((left, right) => left - right);

  const portions = [];
  for (let index = 1; index < ratios.length; index += 1) {
    const startRatio = ratios[index - 1];
    const endRatio = ratios[index];
    if (startRatio !== undefined && endRatio !== undefined && endRatio > startRatio) {
      portions.push({ startRatio, endRatio });
    }
  }
  return portions;
}

function interpolate(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
