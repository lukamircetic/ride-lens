import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
} from "@ride-lens/api";
import {
  activities,
  activity_laps,
  activity_records,
  activity_weather_summaries,
  fit_files,
  heart_rate_zone_profiles,
  type ActivityWeatherSummaryRow,
  type ActivityRow,
  type FitFileRow,
  type HeartRateZoneProfileRow,
  type RideLensDrizzleDatabase,
  type RideLensDatabaseService,
} from "@ride-lens/db";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { Data, Effect } from "effect";
import { calculateHeartRateZoneDistribution } from "@ride-lens/heart-rate-zones";
import { profileRowToResponse } from "./heart-rate-zones";
import { activityWeatherSummaryRowToResponse } from "./weather";

export class ActivityQueryError extends Data.TaggedError("ActivityQueryError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export class ActivityNotFoundError extends Data.TaggedError("ActivityNotFoundError")<{
  readonly activityId: string;
}> {}

type ActivityRecordRow = typeof activity_records.$inferSelect;
type ActivityLapRow = typeof activity_laps.$inferSelect;
type ActivityRoutePointResponse = ActivityRoutesResponse["routes"][number]["points"][number];

const MAX_ROUTE_OVERVIEW_POINTS = 250;

interface ActivityRouteRecordRow {
  readonly activityId: string;
  readonly recordIndex: number;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly altitudeMeters: number | null;
  readonly distanceMeters: number | null;
  readonly speedMetersPerSecond: number | null;
  readonly heartRateBpm: number | null;
}

interface ActivityWithFile {
  readonly activity: ActivityRow;
  readonly fitFile: FitFileRow;
}

const toActivityQueryError = (message: string) => (cause: unknown) =>
  new ActivityQueryError({ operation: message, cause });

export const listActivities = (
  database: RideLensDatabaseService,
  ownerUserId: string,
): Effect.Effect<ActivityListResponse, ActivityQueryError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => queryActivityRows(database.db, ownerUserId),
      catch: toActivityQueryError("Failed to list activities"),
    });

    return {
      activities: rows.map(activityWithFileToListItem),
    };
  });

export const listActivityRoutes = Effect.fn("ActivityQueries.listActivityRoutes")(function* (
  database: RideLensDatabaseService,
  ownerUserId: string,
) {
  const routes = yield* Effect.tryPromise({
    try: () => queryActivityRoutes(database.db, ownerUserId),
    catch: toActivityQueryError("Failed to list activity routes"),
  });

  return {
    routes,
  };
});

export const getActivityDetail = (
  database: RideLensDatabaseService,
  ownerUserId: string,
  activityId: string,
): Effect.Effect<ActivityDetailResponse, ActivityNotFoundError | ActivityQueryError> =>
  Effect.gen(function* () {
    const detail = yield* Effect.tryPromise({
      try: () => queryActivityDetail(database.db, ownerUserId, activityId),
      catch: toActivityQueryError("Failed to load activity detail"),
    });

    if (detail === null) {
      return yield* Effect.fail(new ActivityNotFoundError({ activityId }));
    }

    const heartRateZoneProfile =
      detail.activity.sport === "cycling" && detail.heartRateZoneProfile !== null
        ? profileRowToResponse(detail.heartRateZoneProfile)
        : null;

    return {
      activity: activityWithFileToListItem(detail),
      records: detail.records.map(activityRecordRowToResponse),
      laps: detail.laps.map(activityLapRowToResponse),
      weather:
        detail.weatherSummary === null
          ? null
          : activityWeatherSummaryRowToResponse(detail.weatherSummary),
      heartRateZones:
        heartRateZoneProfile === null
          ? null
          : {
              profile: heartRateZoneProfile,
              distribution: calculateHeartRateZoneDistribution(
                detail.records.map((record) => ({
                  timestampMs: record.timestamp,
                  heartRateBpm: record.heart_rate_bpm,
                })),
                heartRateZoneProfile.zones,
                detail.activity.total_timer_seconds,
              ),
            },
    };
  });

const queryActivityRows = (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
): Promise<ReadonlyArray<ActivityWithFile>> =>
  db
    .select({ activity: activities, fitFile: fit_files })
    .from(activities)
    .innerJoin(fit_files, eq(activities.fit_file_id, fit_files.id))
    .where(eq(activities.owner_user_id, ownerUserId))
    .orderBy(desc(activities.start_time), desc(activities.time_created));

const queryActivityDetail = async (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  activityId: string,
): Promise<
  | (ActivityWithFile & {
      readonly records: ReadonlyArray<ActivityRecordRow>;
      readonly laps: ReadonlyArray<ActivityLapRow>;
      readonly weatherSummary: ActivityWeatherSummaryRow | null;
      readonly heartRateZoneProfile: HeartRateZoneProfileRow | null;
    })
  | null
> => {
  const rows = await db
    .select({ activity: activities, fitFile: fit_files })
    .from(activities)
    .innerJoin(fit_files, eq(activities.fit_file_id, fit_files.id))
    .where(and(eq(activities.id, activityId), eq(activities.owner_user_id, ownerUserId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const [records, laps, weatherSummaryRows, heartRateZoneProfileRows] = await Promise.all([
    db
      .select()
      .from(activity_records)
      .where(eq(activity_records.activity_id, activityId))
      .orderBy(asc(activity_records.record_index)),
    db
      .select()
      .from(activity_laps)
      .where(eq(activity_laps.activity_id, activityId))
      .orderBy(asc(activity_laps.lap_index)),
    db
      .select()
      .from(activity_weather_summaries)
      .where(eq(activity_weather_summaries.activity_id, activityId))
      .limit(1),
    db
      .select()
      .from(heart_rate_zone_profiles)
      .where(
        and(
          eq(heart_rate_zone_profiles.owner_user_id, ownerUserId),
          eq(heart_rate_zone_profiles.sport, "cycling"),
        ),
      )
      .limit(1),
  ]);

  return {
    ...row,
    records,
    laps,
    weatherSummary: weatherSummaryRows[0] ?? null,
    heartRateZoneProfile: heartRateZoneProfileRows[0] ?? null,
  };
};

const queryActivityRoutes = async (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
): Promise<ActivityRoutesResponse["routes"]> => {
  const rows = await queryActivityRows(db, ownerUserId);
  const records = await db
    .select({
      activityId: activity_records.activity_id,
      recordIndex: activity_records.record_index,
      latitude: activity_records.latitude,
      longitude: activity_records.longitude,
      altitudeMeters: activity_records.altitude_meters,
      distanceMeters: activity_records.distance_meters,
      speedMetersPerSecond: activity_records.speed_meters_per_second,
      heartRateBpm: activity_records.heart_rate_bpm,
    })
    .from(activity_records)
    .innerJoin(activities, eq(activity_records.activity_id, activities.id))
    .where(
      and(
        eq(activities.owner_user_id, ownerUserId),
        isNotNull(activity_records.latitude),
        isNotNull(activity_records.longitude),
      ),
    )
    .orderBy(asc(activity_records.activity_id), asc(activity_records.record_index));

  const pointsByActivity = new Map<string, Array<ActivityRoutePointResponse>>();
  for (const record of records) {
    if (
      record.latitude === null ||
      record.longitude === null ||
      !Number.isFinite(record.latitude) ||
      !Number.isFinite(record.longitude)
    ) {
      continue;
    }

    const points = pointsByActivity.get(record.activityId) ?? [];
    points.push(activityRecordRowToRoutePoint(record));
    pointsByActivity.set(record.activityId, points);
  }

  return rows
    .map((row) => ({
      activity: activityWithFileToListItem(row),
      points: thinRoutePoints(
        pointsByActivity.get(row.activity.id) ?? [],
        MAX_ROUTE_OVERVIEW_POINTS,
      ),
    }))
    .filter((route) => route.points.length >= 2);
};

const activityWithFileToListItem = ({
  activity,
  fitFile,
}: ActivityWithFile): ActivityListResponse["activities"][number] => ({
  id: activity.id,
  filename: fitFile.original_filename,
  source: "fit",
  importedAt: epochMsToIso(fitFile.time_created) ?? new Date(0).toISOString(),
  summary: activityRowToSummary(activity),
});

const activityRowToSummary = (
  activity: ActivityRow,
): ActivityDetailResponse["activity"]["summary"] => ({
  startTime: epochMsToIso(activity.start_time),
  endTime: epochMsToIso(activity.end_time),
  sport: activity.sport,
  subSport: activity.sub_sport,
  totalDistanceMeters: activity.total_distance_meters,
  totalElapsedSeconds: activity.total_elapsed_seconds,
  totalTimerSeconds: activity.total_timer_seconds,
  totalMovingSeconds: activity.total_moving_seconds,
  totalAscentMeters: activity.total_ascent_meters,
  totalDescentMeters: activity.total_descent_meters,
  calories: activity.calories,
  avgSpeedMetersPerSecond: activity.avg_speed_meters_per_second,
  maxSpeedMetersPerSecond: activity.max_speed_meters_per_second,
  avgHeartRateBpm: activity.avg_heart_rate_bpm,
  maxHeartRateBpm: activity.max_heart_rate_bpm,
  avgPowerWatts: activity.avg_power_watts,
  maxPowerWatts: activity.max_power_watts,
  normalizedPowerWatts: activity.normalized_power_watts,
  avgCadenceRpm: activity.avg_cadence_rpm,
  startLatitude: activity.start_latitude,
  startLongitude: activity.start_longitude,
  recordCount: activity.record_count,
  lapCount: activity.lap_count,
  sessionCount: activity.session_count,
  hasGps: activity.has_gps,
});

const activityRecordRowToResponse = (
  record: ActivityRecordRow,
): ActivityDetailResponse["records"][number] => ({
  recordIndex: record.record_index,
  timestamp: epochMsToIso(record.timestamp),
  latitude: record.latitude,
  longitude: record.longitude,
  altitudeMeters: record.altitude_meters,
  distanceMeters: record.distance_meters,
  speedMetersPerSecond: record.speed_meters_per_second,
  heartRateBpm: record.heart_rate_bpm,
  cadenceRpm: record.cadence_rpm,
  powerWatts: record.power_watts,
  temperatureCelsius: record.temperature_celsius,
  gradePercent: record.grade_percent,
  gpsAccuracyMeters: record.gps_accuracy_meters,
});

const activityRecordRowToRoutePoint = (
  record: ActivityRouteRecordRow,
): ActivityRoutePointResponse => ({
  recordIndex: record.recordIndex,
  latitude: record.latitude!,
  longitude: record.longitude!,
  altitudeMeters: record.altitudeMeters,
  distanceMeters: record.distanceMeters,
  speedMetersPerSecond: record.speedMetersPerSecond,
  heartRateBpm: record.heartRateBpm,
});

const thinRoutePoints = (
  points: ReadonlyArray<ActivityRoutePointResponse>,
  maxPoints: number,
): Array<ActivityRoutePointResponse> => {
  if (points.length <= maxPoints) return [...points];

  const lastIndex = points.length - 1;
  const sampled = new Map<number, ActivityRoutePointResponse>();
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * lastIndex);
    const point = points[sourceIndex];
    if (point) sampled.set(sourceIndex, point);
  }

  return [...sampled.entries()].sort(([a], [b]) => a - b).map(([, point]) => point);
};

const activityLapRowToResponse = (lap: ActivityLapRow): ActivityDetailResponse["laps"][number] => ({
  lapIndex: lap.lap_index,
  startTime: epochMsToIso(lap.start_time),
  endTime: epochMsToIso(lap.end_time),
  totalDistanceMeters: lap.total_distance_meters,
  totalElapsedSeconds: lap.total_elapsed_seconds,
  totalTimerSeconds: lap.total_timer_seconds,
  avgSpeedMetersPerSecond: lap.avg_speed_meters_per_second,
  maxSpeedMetersPerSecond: lap.max_speed_meters_per_second,
  avgHeartRateBpm: lap.avg_heart_rate_bpm,
  maxHeartRateBpm: lap.max_heart_rate_bpm,
  avgPowerWatts: lap.avg_power_watts,
  maxPowerWatts: lap.max_power_watts,
  avgCadenceRpm: lap.avg_cadence_rpm,
  totalAscentMeters: lap.total_ascent_meters,
  totalDescentMeters: lap.total_descent_meters,
  startLatitude: lap.start_latitude,
  startLongitude: lap.start_longitude,
  endLatitude: lap.end_latitude,
  endLongitude: lap.end_longitude,
});

const epochMsToIso = (value: number | null): string | null =>
  value === null ? null : new Date(value).toISOString();
