import type { FitImportResponse } from "@ride-lens/api";
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
import { and, eq } from "drizzle-orm";
import { Clock, Data, Effect } from "effect";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parseFitActivity, type ParsedFitActivity } from "./fit-parser";

export class ActivityInvalidFitError extends Data.TaggedError("ActivityInvalidFitError")<{
  readonly cause: unknown;
}> {}

export class ActivityImportInternalError extends Data.TaggedError("ActivityImportInternalError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export interface ImportFitActivityOptions {
  readonly filePath: string;
  readonly filename: string;
  readonly ownerUserId: string;
}

interface ExistingActivityImport {
  readonly fitFile: FitFileRow;
  readonly activity: ActivityRow;
}

const toActivityImportInternalError = (operation: string) => (cause: unknown) =>
  new ActivityImportInternalError({ operation, cause });

export const importFitActivity = (
  database: RideLensDatabaseService,
  { filePath, filename, ownerUserId }: ImportFitActivityOptions,
) =>
  Effect.gen(function* () {
    const bytes = yield* readUploadBytes(filePath);
    const sourceHash = hashBytes(bytes);

    const existing = yield* findExistingActivity(database.db, ownerUserId, sourceHash);
    if (existing) {
      return activityRowToResponse(existing.fitFile, existing.activity);
    }

    const parsed = yield* parseFitBytes(bytes);
    const originalFilename = normalizeFilename(filename);
    const relativePath = `fit/${ownerUserId}/${sourceHash}.fit`;
    const absolutePath = join(database.uploadsDir, "fit", ownerUserId, `${sourceHash}.fit`);
    const timeCreated = yield* Clock.currentTimeMillis;

    yield* writeStoredFitFile(absolutePath, bytes);

    return yield* persistParsedActivity({
      db: database.db,
      parsed,
      sourceHash,
      ownerUserId,
      originalFilename,
      relativePath,
      sizeBytes: bytes.byteLength,
      timeCreated,
    });
  });

const readUploadBytes = (filePath: string) =>
  Effect.tryPromise({
    try: () => readFile(filePath),
    catch: toActivityImportInternalError("read FIT upload"),
  });

const parseFitBytes = (bytes: Uint8Array) =>
  Effect.try({
    try: () => parseFitActivity(bytes),
    catch: (cause) => new ActivityInvalidFitError({ cause }),
  });

const writeStoredFitFile = (absolutePath: string, bytes: Uint8Array) =>
  Effect.tryPromise({
    try: async () => {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, bytes);
    },
    catch: toActivityImportInternalError("store FIT upload"),
  });

const findExistingActivity = (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  sourceHash: string,
) =>
  Effect.tryPromise({
    try: async (): Promise<ExistingActivityImport | null> => {
      const rows = await db
        .select({ fitFile: fit_files, activity: activities })
        .from(fit_files)
        .innerJoin(activities, eq(activities.fit_file_id, fit_files.id))
        .where(and(eq(fit_files.owner_user_id, ownerUserId), eq(fit_files.source_hash, sourceHash)))
        .limit(1);

      return rows[0] ?? null;
    },
    catch: toActivityImportInternalError("check existing FIT upload"),
  });

const persistParsedActivity = ({
  db,
  parsed,
  sourceHash,
  ownerUserId,
  originalFilename,
  relativePath,
  sizeBytes,
  timeCreated,
}: {
  readonly db: RideLensDrizzleDatabase;
  readonly parsed: ParsedFitActivity;
  readonly sourceHash: string;
  readonly ownerUserId: string;
  readonly originalFilename: string;
  readonly relativePath: string;
  readonly sizeBytes: number;
  readonly timeCreated: number;
}) =>
  Effect.tryPromise({
    try: async () =>
      db.transaction(async (tx) => {
        const fitFileId = randomUUID();
        const activityId = randomUUID();

        const fitFile = {
          id: fitFileId,
          owner_user_id: ownerUserId,
          source_hash: sourceHash,
          original_filename: originalFilename,
          relative_path: relativePath,
          size_bytes: sizeBytes,
          time_created: timeCreated,
        } satisfies typeof fit_files.$inferInsert;

        const activity = summaryToActivityInsert(
          activityId,
          fitFileId,
          ownerUserId,
          parsed.summary,
          timeCreated,
        );

        await tx.insert(fit_files).values(fitFile);
        await tx.insert(activities).values(activity);

        if (parsed.records.length > 0) {
          await tx.insert(activity_records).values(
            parsed.records.map((record) => ({
              activity_id: activityId,
              record_index: record.recordIndex,
              timestamp: record.timestamp,
              latitude: record.latitude,
              longitude: record.longitude,
              altitude_meters: record.altitudeMeters,
              distance_meters: record.distanceMeters,
              speed_meters_per_second: record.speedMetersPerSecond,
              heart_rate_bpm: record.heartRateBpm,
              cadence_rpm: record.cadenceRpm,
              power_watts: record.powerWatts,
              temperature_celsius: record.temperatureCelsius,
              grade_percent: record.gradePercent,
              gps_accuracy_meters: record.gpsAccuracyMeters,
            })),
          );
        }

        if (parsed.laps.length > 0) {
          await tx.insert(activity_laps).values(
            parsed.laps.map((lap) => ({
              activity_id: activityId,
              lap_index: lap.lapIndex,
              start_time: lap.startTime,
              end_time: lap.endTime,
              total_distance_meters: lap.totalDistanceMeters,
              total_elapsed_seconds: lap.totalElapsedSeconds,
              total_timer_seconds: lap.totalTimerSeconds,
              avg_speed_meters_per_second: lap.avgSpeedMetersPerSecond,
              max_speed_meters_per_second: lap.maxSpeedMetersPerSecond,
              avg_heart_rate_bpm: lap.avgHeartRateBpm,
              max_heart_rate_bpm: lap.maxHeartRateBpm,
              avg_power_watts: lap.avgPowerWatts,
              max_power_watts: lap.maxPowerWatts,
              avg_cadence_rpm: lap.avgCadenceRpm,
              total_ascent_meters: lap.totalAscentMeters,
              total_descent_meters: lap.totalDescentMeters,
              start_latitude: lap.startLatitude,
              start_longitude: lap.startLongitude,
              end_latitude: lap.endLatitude,
              end_longitude: lap.endLongitude,
            })),
          );
        }

        return {
          importId: activityId,
          filename: originalFilename,
          source: "fit",
          status: "parsed",
          summary: parsed.summary,
        } satisfies FitImportResponse;
      }),
    catch: toActivityImportInternalError("persist FIT import"),
  });

const summaryToActivityInsert = (
  activityId: string,
  fitFileId: string,
  ownerUserId: string,
  summary: FitImportResponse["summary"],
  timeCreated: number,
) =>
  ({
    id: activityId,
    owner_user_id: ownerUserId,
    fit_file_id: fitFileId,
    start_time: isoToEpochMs(summary.startTime),
    end_time: isoToEpochMs(summary.endTime),
    sport: summary.sport,
    sub_sport: summary.subSport,
    total_distance_meters: summary.totalDistanceMeters,
    total_elapsed_seconds: summary.totalElapsedSeconds,
    total_timer_seconds: summary.totalTimerSeconds,
    total_moving_seconds: summary.totalMovingSeconds,
    total_ascent_meters: summary.totalAscentMeters,
    total_descent_meters: summary.totalDescentMeters,
    calories: summary.calories,
    avg_speed_meters_per_second: summary.avgSpeedMetersPerSecond,
    max_speed_meters_per_second: summary.maxSpeedMetersPerSecond,
    avg_heart_rate_bpm: summary.avgHeartRateBpm,
    max_heart_rate_bpm: summary.maxHeartRateBpm,
    avg_power_watts: summary.avgPowerWatts,
    max_power_watts: summary.maxPowerWatts,
    normalized_power_watts: summary.normalizedPowerWatts,
    avg_cadence_rpm: summary.avgCadenceRpm,
    start_latitude: summary.startLatitude,
    start_longitude: summary.startLongitude,
    record_count: summary.recordCount,
    lap_count: summary.lapCount,
    session_count: summary.sessionCount,
    has_gps: summary.hasGps,
    time_created: timeCreated,
  }) satisfies typeof activities.$inferInsert;

const activityRowToResponse = (fitFile: FitFileRow, activity: ActivityRow): FitImportResponse => ({
  importId: activity.id,
  filename: fitFile.original_filename,
  source: "fit",
  status: "parsed",
  summary: {
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
  },
});

const hashBytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const normalizeFilename = (filename: string): string => basename(filename) || "activity.fit";

const isoToEpochMs = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) ? epochMs : null;
};

const epochMsToIso = (value: number | null): string | null =>
  value === null ? null : new Date(value).toISOString();
