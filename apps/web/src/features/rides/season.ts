import { parseIsoDate } from "./formatters";
import type { ActivityListItem } from "./types";

export interface SeasonTotals {
  rideCount: number;
  distanceMeters: number;
  movingSeconds: number;
  elapsedSeconds: number;
  ascentMeters: number;
  descentMeters: number;
  avgSpeedMetersPerSecond: number | null;
}

export interface SeasonSnapshotData {
  activeMonths: number;
  latestRide: ActivityListItem | null;
  longestRide: ActivityListItem | null;
  fastestRide: ActivityListItem | null;
  biggestClimb: ActivityListItem | null;
  recentDistanceMeters: number;
  previousDistanceMeters: number | null;
  distanceDeltaMeters: number | null;
  recentAvgSpeedMetersPerSecond: number | null;
  previousAvgSpeedMetersPerSecond: number | null;
  speedDeltaMetersPerSecond: number | null;
}

export function summarizeActivities(activities: ReadonlyArray<ActivityListItem>): SeasonTotals {
  const distanceMeters = activities.reduce((s, a) => s + (a.summary.totalDistanceMeters ?? 0), 0);
  const movingSeconds = activities.reduce((s, a) => s + (a.summary.totalMovingSeconds ?? 0), 0);
  const elapsedSeconds = activities.reduce((s, a) => s + (a.summary.totalElapsedSeconds ?? 0), 0);
  const ascentMeters = activities.reduce((s, a) => s + (a.summary.totalAscentMeters ?? 0), 0);
  const descentMeters = activities.reduce((s, a) => s + (a.summary.totalDescentMeters ?? 0), 0);

  return {
    rideCount: activities.length,
    distanceMeters,
    movingSeconds,
    elapsedSeconds,
    ascentMeters,
    descentMeters,
    avgSpeedMetersPerSecond: movingSeconds > 0 ? distanceMeters / movingSeconds : null,
  };
}

export function summarizeSeason(activities: ReadonlyArray<ActivityListItem>): SeasonSnapshotData {
  const ordered = [...activities].sort((a, b) => {
    const at = parseIsoDate(a.summary.startTime)?.getTime() ?? 0;
    const bt = parseIsoDate(b.summary.startTime)?.getTime() ?? 0;
    return bt - at;
  });
  const activeMonths = new Set(
    ordered
      .map((a) => parseIsoDate(a.summary.startTime))
      .filter((d): d is Date => d !== null)
      .map((d) => `${d.getFullYear()}-${d.getMonth()}`),
  ).size;
  const recent = ordered.slice(0, 4);
  const previous = ordered.slice(4, 8);
  const recentDistanceMeters = sumDistance(recent);
  const previousDistanceMeters = previous.length > 0 ? sumDistance(previous) : null;
  const recentAvgSpeedMetersPerSecond = weightedAverageSpeed(recent);
  const previousAvgSpeedMetersPerSecond =
    previous.length > 0 ? weightedAverageSpeed(previous) : null;

  return {
    activeMonths,
    latestRide: ordered[0] ?? null,
    longestRide: maxBy(ordered, (a) => a.summary.totalDistanceMeters),
    fastestRide: maxBy(ordered, (a) => a.summary.avgSpeedMetersPerSecond),
    biggestClimb: maxBy(ordered, (a) => a.summary.totalAscentMeters),
    recentDistanceMeters,
    previousDistanceMeters,
    distanceDeltaMeters:
      previousDistanceMeters === null ? null : recentDistanceMeters - previousDistanceMeters,
    recentAvgSpeedMetersPerSecond,
    previousAvgSpeedMetersPerSecond,
    speedDeltaMetersPerSecond:
      previousAvgSpeedMetersPerSecond === null || recentAvgSpeedMetersPerSecond === null
        ? null
        : recentAvgSpeedMetersPerSecond - previousAvgSpeedMetersPerSecond,
  };
}

export function monthlyDistance(activities: ReadonlyArray<ActivityListItem>): number {
  return activities.reduce((s, a) => s + (a.summary.totalDistanceMeters ?? 0), 0);
}

function maxBy(
  activities: ReadonlyArray<ActivityListItem>,
  getValue: (a: ActivityListItem) => number | null,
): ActivityListItem | null {
  let best: ActivityListItem | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const activity of activities) {
    const value = getValue(activity);

    if (value !== null && Number.isFinite(value) && value > bestValue) {
      best = activity;
      bestValue = value;
    }
  }

  return best;
}

function sumDistance(activities: ReadonlyArray<ActivityListItem>): number {
  return activities.reduce((s, a) => s + (a.summary.totalDistanceMeters ?? 0), 0);
}

function weightedAverageSpeed(activities: ReadonlyArray<ActivityListItem>): number | null {
  const movingSeconds = activities.reduce((s, a) => s + (a.summary.totalMovingSeconds ?? 0), 0);
  return movingSeconds > 0 ? sumDistance(activities) / movingSeconds : null;
}
