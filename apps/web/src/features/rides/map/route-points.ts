import type { ActivityRecord, ActivityRoutePoint } from "../types";

export function recordsToRoutePoints(
  records: ReadonlyArray<ActivityRecord>,
): Array<ActivityRoutePoint> {
  return records
    .filter(
      (record) =>
        typeof record.latitude === "number" &&
        typeof record.longitude === "number" &&
        Number.isFinite(record.latitude) &&
        Number.isFinite(record.longitude),
    )
    .map((record) => ({
      recordIndex: record.recordIndex,
      latitude: record.latitude!,
      longitude: record.longitude!,
      altitudeMeters: record.altitudeMeters,
      distanceMeters: record.distanceMeters,
      speedMetersPerSecond: record.speedMetersPerSecond,
      heartRateBpm: record.heartRateBpm,
    }));
}
