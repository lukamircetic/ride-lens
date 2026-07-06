import type { ActivityDetailResponse, ActivityListResponse } from "@ride-lens/api";
import {
  activities,
  activity_laps,
  activity_records,
  fit_files,
  type ActivityRow,
  type FitFileRow,
  type RideLensDrizzleDatabase,
  type RideLensDatabaseService,
} from "@ride-lens/db";
import { asc, desc, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

export class ActivityQueryError extends Data.TaggedError("ActivityQueryError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export class ActivityNotFoundError extends Data.TaggedError("ActivityNotFoundError")<{
  readonly activityId: string;
}> {}

type ActivityRecordRow = typeof activity_records.$inferSelect;
type ActivityLapRow = typeof activity_laps.$inferSelect;

interface ActivityWithFile {
  readonly activity: ActivityRow;
  readonly fitFile: FitFileRow;
}

const toActivityQueryError = (message: string) => (cause: unknown) =>
  new ActivityQueryError({ operation: message, cause });

export const listActivities = (
  database: RideLensDatabaseService,
): Effect.Effect<ActivityListResponse, ActivityQueryError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => queryActivityRows(database.db),
      catch: toActivityQueryError("Failed to list activities"),
    });

    return {
      activities: rows.map(activityWithFileToListItem),
    };
  });

export const getActivityDetail = (
  database: RideLensDatabaseService,
  activityId: string,
): Effect.Effect<ActivityDetailResponse, ActivityNotFoundError | ActivityQueryError> =>
  Effect.gen(function* () {
    const detail = yield* Effect.tryPromise({
      try: () => queryActivityDetail(database.db, activityId),
      catch: toActivityQueryError("Failed to load activity detail"),
    });

    if (detail === null) {
      return yield* Effect.fail(new ActivityNotFoundError({ activityId }));
    }

    return {
      activity: activityWithFileToListItem(detail),
      records: detail.records.map(activityRecordRowToResponse),
      laps: detail.laps.map(activityLapRowToResponse),
    };
  });

const queryActivityRows = (db: RideLensDrizzleDatabase): Promise<ReadonlyArray<ActivityWithFile>> =>
  db
    .select({ activity: activities, fitFile: fit_files })
    .from(activities)
    .innerJoin(fit_files, eq(activities.fit_file_id, fit_files.id))
    .orderBy(desc(activities.start_time), desc(activities.time_created));

const queryActivityDetail = async (
  db: RideLensDrizzleDatabase,
  activityId: string,
): Promise<
  | (ActivityWithFile & {
      readonly records: ReadonlyArray<ActivityRecordRow>;
      readonly laps: ReadonlyArray<ActivityLapRow>;
    })
  | null
> => {
  const rows = await db
    .select({ activity: activities, fitFile: fit_files })
    .from(activities)
    .innerJoin(fit_files, eq(activities.fit_file_id, fit_files.id))
    .where(eq(activities.id, activityId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const [records, laps] = await Promise.all([
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
  ]);

  return {
    ...row,
    records,
    laps,
  };
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
