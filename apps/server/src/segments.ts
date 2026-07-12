import type {
  ActivityListResponse,
  ActivitySegmentsResponse,
  CreateSegmentPayload,
  SegmentDetailResponse,
  SegmentListResponse,
  UpdateSegmentPayload,
} from "@ride-lens/api";
import {
  activities,
  activity_records,
  fit_files,
  segment_efforts,
  segments as segmentsTable,
  type ActivityRow,
  type FitFileRow,
  RideLensDatabase,
  type RideLensDatabaseService,
  type RideLensDrizzleDatabase,
  type SegmentEffortRow,
  type SegmentRow,
} from "@ride-lens/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";
import { randomUUID } from "node:crypto";
import { claimMigratedOwnership } from "./ownership";
import { computeSegmentRange, findSegmentMatches, type SegmentRecord } from "./segment-matching";

export class SegmentValidationError extends Data.TaggedError("SegmentValidationError")<{
  readonly message: string;
}> {}

export class SegmentQueryError extends Data.TaggedError("SegmentQueryError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export class SegmentNotFoundError extends Data.TaggedError("SegmentNotFoundError")<{
  readonly segmentId: string;
}> {}

const claimOwnership = (database: RideLensDatabaseService, ownerUserId: string) =>
  claimMigratedOwnership(database, ownerUserId).pipe(
    Effect.mapError(
      (error) => new SegmentQueryError({ operation: "claim legacy ownership", cause: error.cause }),
    ),
  );

interface ActivityWithFile {
  readonly activity: ActivityRow;
  readonly fitFile: FitFileRow;
}

interface EffortWithActivity {
  readonly effort: SegmentEffortRow;
  readonly activity: ActivityRow;
  readonly fitFile: FitFileRow;
}

interface SegmentDetailRows {
  readonly segment: SegmentRow;
  readonly efforts: ReadonlyArray<EffortWithActivity>;
}

export class Segments extends Context.Service<
  Segments,
  {
    readonly create: (
      ownerUserId: string,
      payload: CreateSegmentPayload,
    ) => Effect.Effect<SegmentDetailResponse, SegmentValidationError | SegmentQueryError>;
    readonly update: (
      ownerUserId: string,
      segmentId: string,
      payload: UpdateSegmentPayload,
    ) => Effect.Effect<
      SegmentDetailResponse,
      SegmentValidationError | SegmentNotFoundError | SegmentQueryError
    >;
    readonly list: (ownerUserId: string) => Effect.Effect<SegmentListResponse, SegmentQueryError>;
    readonly listForActivity: (
      ownerUserId: string,
      activityId: string,
    ) => Effect.Effect<ActivitySegmentsResponse, SegmentQueryError>;
  }
>()("@ride-lens/server/Segments") {
  static readonly layer = Layer.effect(
    Segments,
    Effect.gen(function* () {
      const database = yield* RideLensDatabase;

      return Segments.of({
        create: Effect.fn("Segments.create")(function* (
          ownerUserId: string,
          payload: CreateSegmentPayload,
        ) {
          return yield* createSegment(database, ownerUserId, payload);
        }),
        update: Effect.fn("Segments.update")(function* (
          ownerUserId: string,
          segmentId: string,
          payload: UpdateSegmentPayload,
        ) {
          return yield* updateSegment(database, ownerUserId, segmentId, payload);
        }),
        list: Effect.fn("Segments.list")(function* (ownerUserId: string) {
          return yield* listSegments(database, ownerUserId);
        }),
        listForActivity: Effect.fn("Segments.listForActivity")(function* (
          ownerUserId: string,
          activityId: string,
        ) {
          return yield* listActivitySegments(database, ownerUserId, activityId);
        }),
      });
    }),
  );
}

const createSegment = (
  database: RideLensDatabaseService,
  ownerUserId: string,
  payload: CreateSegmentPayload,
): Effect.Effect<SegmentDetailResponse, SegmentValidationError | SegmentQueryError> =>
  Effect.gen(function* () {
    yield* claimOwnership(database, ownerUserId);
    const name = payload.name.trim();
    if (name.length === 0) {
      return yield* Effect.fail(
        new SegmentValidationError({ message: "Segment name is required" }),
      );
    }

    const sourceActivity = yield* loadActivity(database.db, ownerUserId, payload.activityId);
    if (sourceActivity === null) {
      return yield* Effect.fail(
        new SegmentValidationError({ message: "Source activity not found" }),
      );
    }

    const sourceRecords = yield* loadActivityRecords(database.db, payload.activityId);
    const range = computeSegmentRange(
      sourceRecords,
      payload.startRecordIndex,
      payload.endRecordIndex,
    );
    if (range === null || range.geometry.length < 2) {
      return yield* Effect.fail(
        new SegmentValidationError({ message: "Segment needs at least two GPS records" }),
      );
    }

    const now = Date.now();
    const segmentId = randomUUID();
    const sourceEffortId = randomUUID();
    const matchedEfforts = yield* buildMatchedEffortRows(
      database.db,
      ownerUserId,
      segmentId,
      sourceActivity.activity.id,
      range.geometry,
      now,
    );

    yield* Effect.tryPromise({
      try: () =>
        database.db.transaction(async (tx) => {
          await tx.insert(segmentsTable).values({
            id: segmentId,
            source_activity_id: sourceActivity.activity.id,
            name,
            source: "manual",
            sport: sourceActivity.activity.sport,
            start_record_index: range.startRecordIndex,
            end_record_index: range.endRecordIndex,
            start_distance_meters: range.startDistanceMeters,
            end_distance_meters: range.endDistanceMeters,
            start_time: range.startTime,
            end_time: range.endTime,
            start_latitude: range.startLatitude,
            start_longitude: range.startLongitude,
            end_latitude: range.endLatitude,
            end_longitude: range.endLongitude,
            ...statsToSegmentColumns(range.stats),
            geometry_json: JSON.stringify(range.geometry),
            created_at: now,
            updated_at: now,
          });
          await tx.insert(segment_efforts).values({
            id: sourceEffortId,
            segment_id: segmentId,
            activity_id: sourceActivity.activity.id,
            attempt_index: 1,
            source: "source",
            start_record_index: range.startRecordIndex,
            end_record_index: range.endRecordIndex,
            start_distance_meters: range.startDistanceMeters,
            end_distance_meters: range.endDistanceMeters,
            start_time: range.startTime,
            end_time: range.endTime,
            ...statsToSegmentColumns(range.stats),
            coverage_ratio: 1,
            confidence: 1,
            average_deviation_meters: 0,
            max_deviation_meters: 0,
            computed_at: now,
          });
          if (matchedEfforts.length > 0) {
            await tx.insert(segment_efforts).values(matchedEfforts);
          }
        }),
      catch: (cause) => new SegmentQueryError({ operation: "create segment", cause }),
    });

    const detail = yield* Effect.tryPromise({
      try: () => querySegmentDetail(database.db, ownerUserId, segmentId),
      catch: (cause) => new SegmentQueryError({ operation: "load created segment", cause }),
    });
    if (detail === null) {
      return yield* Effect.fail(
        new SegmentQueryError({ operation: "load created segment", cause: null }),
      );
    }

    return segmentDetailRowsToResponse(detail);
  });

const updateSegment = (
  database: RideLensDatabaseService,
  ownerUserId: string,
  segmentId: string,
  payload: UpdateSegmentPayload,
): Effect.Effect<
  SegmentDetailResponse,
  SegmentValidationError | SegmentNotFoundError | SegmentQueryError
> =>
  Effect.gen(function* () {
    yield* claimOwnership(database, ownerUserId);
    const name = payload.name.trim();
    if (name.length === 0) {
      return yield* Effect.fail(
        new SegmentValidationError({ message: "Segment name is required" }),
      );
    }

    const existing = yield* loadSegment(database.db, ownerUserId, segmentId);
    if (existing === null) {
      return yield* Effect.fail(new SegmentNotFoundError({ segmentId }));
    }

    const sourceActivity = yield* loadActivity(
      database.db,
      ownerUserId,
      existing.source_activity_id,
    );
    if (sourceActivity === null) {
      return yield* Effect.fail(
        new SegmentValidationError({ message: "Source activity not found" }),
      );
    }

    const sourceRecords = yield* loadActivityRecords(database.db, sourceActivity.activity.id);
    const range = computeSegmentRange(
      sourceRecords,
      payload.startRecordIndex,
      payload.endRecordIndex,
    );
    if (range === null || range.geometry.length < 2) {
      return yield* Effect.fail(
        new SegmentValidationError({ message: "Segment needs at least two GPS records" }),
      );
    }

    const now = Date.now();
    const matchedEfforts = yield* buildMatchedEffortRows(
      database.db,
      ownerUserId,
      segmentId,
      sourceActivity.activity.id,
      range.geometry,
      now,
    );

    yield* Effect.tryPromise({
      try: () =>
        database.db.transaction(async (tx) => {
          await tx
            .update(segmentsTable)
            .set({
              name,
              sport: sourceActivity.activity.sport,
              start_record_index: range.startRecordIndex,
              end_record_index: range.endRecordIndex,
              start_distance_meters: range.startDistanceMeters,
              end_distance_meters: range.endDistanceMeters,
              start_time: range.startTime,
              end_time: range.endTime,
              start_latitude: range.startLatitude,
              start_longitude: range.startLongitude,
              end_latitude: range.endLatitude,
              end_longitude: range.endLongitude,
              ...statsToSegmentColumns(range.stats),
              geometry_json: JSON.stringify(range.geometry),
              updated_at: now,
            })
            .where(eq(segmentsTable.id, segmentId));
          await tx.delete(segment_efforts).where(eq(segment_efforts.segment_id, segmentId));
          await tx.insert(segment_efforts).values({
            id: randomUUID(),
            segment_id: segmentId,
            activity_id: sourceActivity.activity.id,
            attempt_index: 1,
            source: "source",
            start_record_index: range.startRecordIndex,
            end_record_index: range.endRecordIndex,
            start_distance_meters: range.startDistanceMeters,
            end_distance_meters: range.endDistanceMeters,
            start_time: range.startTime,
            end_time: range.endTime,
            ...statsToSegmentColumns(range.stats),
            coverage_ratio: 1,
            confidence: 1,
            average_deviation_meters: 0,
            max_deviation_meters: 0,
            computed_at: now,
          });
          if (matchedEfforts.length > 0) {
            await tx.insert(segment_efforts).values(matchedEfforts);
          }
        }),
      catch: (cause) => new SegmentQueryError({ operation: "update segment", cause }),
    });

    const detail = yield* Effect.tryPromise({
      try: () => querySegmentDetail(database.db, ownerUserId, segmentId),
      catch: (cause) => new SegmentQueryError({ operation: "load updated segment", cause }),
    });
    if (detail === null) {
      return yield* Effect.fail(new SegmentNotFoundError({ segmentId }));
    }

    return segmentDetailRowsToResponse(detail);
  });

const listSegments = (
  database: RideLensDatabaseService,
  ownerUserId: string,
): Effect.Effect<SegmentListResponse, SegmentQueryError> =>
  Effect.gen(function* () {
    yield* claimOwnership(database, ownerUserId);
    const rows = yield* Effect.tryPromise({
      try: () => querySegmentDetails(database.db, ownerUserId),
      catch: (cause) => new SegmentQueryError({ operation: "list segments", cause }),
    });

    return { segments: rows.map(segmentDetailRowsToResponse) };
  });

export const listActivitySegments = (
  database: RideLensDatabaseService,
  ownerUserId: string,
  activityId: string,
): Effect.Effect<ActivitySegmentsResponse, SegmentQueryError> =>
  Effect.gen(function* () {
    yield* claimOwnership(database, ownerUserId);
    const details = yield* Effect.tryPromise({
      try: () => querySegmentDetails(database.db, ownerUserId),
      catch: (cause) => new SegmentQueryError({ operation: "list activity segments", cause }),
    });

    return {
      segments: details.flatMap((detail) =>
        detail.efforts
          .filter(({ effort }) => effort.activity_id === activityId)
          .map((effort) => ({
            segment: segmentRowToResponse(detail.segment),
            effort: effortRowToResponse(effort),
          })),
      ),
    };
  });

export const matchExistingSegmentsForActivity = (
  database: RideLensDatabaseService,
  ownerUserId: string,
  activityId: string,
): Effect.Effect<void, SegmentQueryError> =>
  Effect.gen(function* () {
    const records = yield* loadActivityRecords(database.db, activityId);
    const segmentRows = yield* Effect.tryPromise({
      try: async () => {
        const rows = await database.db
          .select({ segment: segmentsTable })
          .from(segmentsTable)
          .innerJoin(activities, eq(segmentsTable.source_activity_id, activities.id))
          .where(eq(activities.owner_user_id, ownerUserId))
          .orderBy(desc(segmentsTable.created_at));
        return rows.map(({ segment }) => segment);
      },
      catch: (cause) =>
        new SegmentQueryError({ operation: "load segments for activity match", cause }),
    });
    const now = Date.now();
    const effortRows: Array<typeof segment_efforts.$inferInsert> = [];

    for (const segment of segmentRows) {
      if (segment.source_activity_id === activityId) continue;

      const matches = findSegmentMatches(parseGeometry(segment.geometry_json), records);
      for (const [index, match] of matches.entries()) {
        const range = computeSegmentRange(records, match.startRecordIndex, match.endRecordIndex);
        if (range === null) continue;

        effortRows.push({
          id: randomUUID(),
          segment_id: segment.id,
          activity_id: activityId,
          attempt_index: index + 1,
          source: "matched",
          start_record_index: range.startRecordIndex,
          end_record_index: range.endRecordIndex,
          start_distance_meters: range.startDistanceMeters,
          end_distance_meters: range.endDistanceMeters,
          start_time: range.startTime,
          end_time: range.endTime,
          ...statsToSegmentColumns(range.stats),
          coverage_ratio: match.coverageRatio,
          confidence: match.confidence,
          average_deviation_meters: match.averageDeviationMeters,
          max_deviation_meters: match.maxDeviationMeters,
          computed_at: now,
        });
      }
    }

    yield* Effect.tryPromise({
      try: () =>
        database.db.transaction(async (tx) => {
          await tx
            .delete(segment_efforts)
            .where(
              and(
                eq(segment_efforts.activity_id, activityId),
                eq(segment_efforts.source, "matched"),
              ),
            );
          if (effortRows.length > 0) {
            await tx.insert(segment_efforts).values(effortRows);
          }
        }),
      catch: (cause) =>
        new SegmentQueryError({ operation: "persist activity segment matches", cause }),
    });
  });

const buildMatchedEffortRows = (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  segmentId: string,
  sourceActivityId: string,
  sourceGeometry: SegmentDetailResponse["segment"]["geometry"],
  now: number,
): Effect.Effect<Array<typeof segment_efforts.$inferInsert>, SegmentQueryError> =>
  Effect.tryPromise({
    try: async () => {
      const activitiesWithFiles = await queryActivityRows(db, ownerUserId);
      const rows: Array<typeof segment_efforts.$inferInsert> = [];

      for (const activityWithFile of activitiesWithFiles) {
        const activityId = activityWithFile.activity.id;
        if (activityId === sourceActivityId) continue;

        const records = await queryActivityRecords(db, activityId);
        const matches = findSegmentMatches(sourceGeometry, records);
        for (const [index, match] of matches.entries()) {
          const range = computeSegmentRange(records, match.startRecordIndex, match.endRecordIndex);
          if (range === null) continue;

          rows.push({
            id: randomUUID(),
            segment_id: segmentId,
            activity_id: activityId,
            attempt_index: index + 1,
            source: "matched",
            start_record_index: range.startRecordIndex,
            end_record_index: range.endRecordIndex,
            start_distance_meters: range.startDistanceMeters,
            end_distance_meters: range.endDistanceMeters,
            start_time: range.startTime,
            end_time: range.endTime,
            ...statsToSegmentColumns(range.stats),
            coverage_ratio: match.coverageRatio,
            confidence: match.confidence,
            average_deviation_meters: match.averageDeviationMeters,
            max_deviation_meters: match.maxDeviationMeters,
            computed_at: now,
          });
        }
      }

      return rows;
    },
    catch: (cause) => new SegmentQueryError({ operation: "match segment efforts", cause }),
  });

const loadSegment = (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  segmentId: string,
): Effect.Effect<SegmentRow | null, SegmentQueryError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ segment: segmentsTable })
        .from(segmentsTable)
        .innerJoin(activities, eq(segmentsTable.source_activity_id, activities.id))
        .where(and(eq(segmentsTable.id, segmentId), eq(activities.owner_user_id, ownerUserId)))
        .limit(1);
      return rows[0]?.segment ?? null;
    },
    catch: (cause) => new SegmentQueryError({ operation: "load segment", cause }),
  });

const loadActivity = (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  activityId: string,
): Effect.Effect<ActivityWithFile | null, SegmentQueryError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ activity: activities, fitFile: fit_files })
        .from(activities)
        .innerJoin(fit_files, eq(activities.fit_file_id, fit_files.id))
        .where(and(eq(activities.id, activityId), eq(activities.owner_user_id, ownerUserId)))
        .limit(1);
      return rows[0] ?? null;
    },
    catch: (cause) => new SegmentQueryError({ operation: "load activity for segment", cause }),
  });

const loadActivityRecords = (
  db: RideLensDrizzleDatabase,
  activityId: string,
): Effect.Effect<ReadonlyArray<SegmentRecord>, SegmentQueryError> =>
  Effect.tryPromise({
    try: () => queryActivityRecords(db, activityId),
    catch: (cause) =>
      new SegmentQueryError({ operation: "load activity records for segment", cause }),
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

const queryActivityRecords = async (
  db: RideLensDrizzleDatabase,
  activityId: string,
): Promise<ReadonlyArray<SegmentRecord>> => {
  const rows = await db
    .select()
    .from(activity_records)
    .where(eq(activity_records.activity_id, activityId))
    .orderBy(asc(activity_records.record_index));

  return rows.map((record) => ({
    activityId: record.activity_id,
    recordIndex: record.record_index,
    timestamp: record.timestamp,
    latitude: record.latitude,
    longitude: record.longitude,
    altitudeMeters: record.altitude_meters,
    distanceMeters: record.distance_meters,
    speedMetersPerSecond: record.speed_meters_per_second,
    heartRateBpm: record.heart_rate_bpm,
    cadenceRpm: record.cadence_rpm,
    powerWatts: record.power_watts,
  }));
};

const querySegmentDetail = async (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  segmentId: string,
): Promise<SegmentDetailRows | null> => {
  const rows = await querySegmentDetails(db, ownerUserId, [segmentId]);
  return rows[0] ?? null;
};

const querySegmentDetails = async (
  db: RideLensDrizzleDatabase,
  ownerUserId: string,
  segmentIds?: ReadonlyArray<string>,
): Promise<ReadonlyArray<SegmentDetailRows>> => {
  const segmentRowsWithOwner = await db
    .select({ segment: segmentsTable })
    .from(segmentsTable)
    .innerJoin(activities, eq(segmentsTable.source_activity_id, activities.id))
    .where(
      and(
        eq(activities.owner_user_id, ownerUserId),
        segmentIds && segmentIds.length > 0 ? inArray(segmentsTable.id, segmentIds) : undefined,
      ),
    )
    .orderBy(desc(segmentsTable.created_at));
  const segmentRows = segmentRowsWithOwner.map(({ segment }) => segment);

  if (segmentRows.length === 0) return [];

  const effortRows = await db
    .select({ effort: segment_efforts, activity: activities, fitFile: fit_files })
    .from(segment_efforts)
    .innerJoin(activities, eq(segment_efforts.activity_id, activities.id))
    .innerJoin(fit_files, eq(activities.fit_file_id, fit_files.id))
    .where(
      and(
        eq(activities.owner_user_id, ownerUserId),
        inArray(
          segment_efforts.segment_id,
          segmentRows.map((segment) => segment.id),
        ),
      ),
    )
    .orderBy(asc(segment_efforts.segment_id), asc(segment_efforts.elapsed_seconds));

  return segmentRows.map((segment) => ({
    segment,
    efforts: effortRows.filter(({ effort }) => effort.segment_id === segment.id),
  }));
};

const segmentDetailRowsToResponse = (detail: SegmentDetailRows): SegmentDetailResponse => ({
  segment: segmentRowToResponse(detail.segment),
  efforts: detail.efforts.map(effortRowToResponse),
});

const segmentRowToResponse = (segment: SegmentRow): SegmentDetailResponse["segment"] => ({
  id: segment.id,
  name: segment.name,
  source: "manual",
  sport: segment.sport,
  sourceActivityId: segment.source_activity_id,
  startRecordIndex: segment.start_record_index,
  endRecordIndex: segment.end_record_index,
  startDistanceMeters: segment.start_distance_meters,
  endDistanceMeters: segment.end_distance_meters,
  startTime: epochMsToIso(segment.start_time),
  endTime: epochMsToIso(segment.end_time),
  startLatitude: segment.start_latitude,
  startLongitude: segment.start_longitude,
  endLatitude: segment.end_latitude,
  endLongitude: segment.end_longitude,
  stats: segmentStatsFromColumns(segment),
  geometry: parseGeometry(segment.geometry_json),
  createdAt: epochMsToIso(segment.created_at) ?? new Date(0).toISOString(),
  updatedAt: epochMsToIso(segment.updated_at) ?? new Date(0).toISOString(),
});

const effortRowToResponse = ({
  effort,
  activity,
  fitFile,
}: EffortWithActivity): SegmentDetailResponse["efforts"][number] => ({
  id: effort.id,
  segmentId: effort.segment_id,
  activityId: effort.activity_id,
  activity: activityWithFileToListItem({ activity, fitFile }),
  attemptIndex: effort.attempt_index,
  source: effort.source === "source" ? "source" : "matched",
  startRecordIndex: effort.start_record_index,
  endRecordIndex: effort.end_record_index,
  startDistanceMeters: effort.start_distance_meters,
  endDistanceMeters: effort.end_distance_meters,
  startTime: epochMsToIso(effort.start_time),
  endTime: epochMsToIso(effort.end_time),
  stats: segmentStatsFromColumns(effort),
  coverageRatio: effort.coverage_ratio,
  confidence: effort.confidence,
  averageDeviationMeters: effort.average_deviation_meters,
  maxDeviationMeters: effort.max_deviation_meters,
  computedAt: epochMsToIso(effort.computed_at) ?? new Date(0).toISOString(),
});

const statsToSegmentColumns = (stats: SegmentDetailResponse["segment"]["stats"]) => ({
  distance_meters: stats.distanceMeters,
  elapsed_seconds: stats.elapsedSeconds,
  moving_seconds: stats.movingSeconds,
  average_speed_meters_per_second: stats.averageSpeedMetersPerSecond,
  max_speed_meters_per_second: stats.maxSpeedMetersPerSecond,
  average_heart_rate_bpm: stats.averageHeartRateBpm,
  max_heart_rate_bpm: stats.maxHeartRateBpm,
  elevation_gain_meters: stats.elevationGainMeters,
  elevation_loss_meters: stats.elevationLossMeters,
  vam_meters_per_hour: stats.vamMetersPerHour,
  average_cadence_rpm: stats.averageCadenceRpm,
  average_power_watts: stats.averagePowerWatts,
  normalized_power_watts: stats.normalizedPowerWatts,
});

const segmentStatsFromColumns = (
  row: SegmentRow | SegmentEffortRow,
): SegmentDetailResponse["segment"]["stats"] => ({
  distanceMeters: row.distance_meters,
  elapsedSeconds: row.elapsed_seconds,
  movingSeconds: row.moving_seconds,
  averageSpeedMetersPerSecond: row.average_speed_meters_per_second,
  maxSpeedMetersPerSecond: row.max_speed_meters_per_second,
  averageHeartRateBpm: row.average_heart_rate_bpm,
  maxHeartRateBpm: row.max_heart_rate_bpm,
  elevationGainMeters: row.elevation_gain_meters,
  elevationLossMeters: row.elevation_loss_meters,
  vamMetersPerHour: row.vam_meters_per_hour,
  averageCadenceRpm: row.average_cadence_rpm,
  averagePowerWatts: row.average_power_watts,
  normalizedPowerWatts: row.normalized_power_watts,
});

const activityWithFileToListItem = ({
  activity,
  fitFile,
}: ActivityWithFile): ActivityListResponse["activities"][number] => ({
  id: activity.id,
  filename: fitFile.original_filename,
  source: "fit",
  importedAt: epochMsToIso(fitFile.time_created) ?? new Date(0).toISOString(),
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

const parseGeometry = (value: string): SegmentDetailResponse["segment"]["geometry"] => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((point) => {
      if (
        typeof point !== "object" ||
        point === null ||
        typeof (point as { recordIndex?: unknown }).recordIndex !== "number" ||
        typeof (point as { latitude?: unknown }).latitude !== "number" ||
        typeof (point as { longitude?: unknown }).longitude !== "number"
      ) {
        return [];
      }

      const distanceMeters = (point as { distanceMeters?: unknown }).distanceMeters;
      return [
        {
          recordIndex: (point as { recordIndex: number }).recordIndex,
          latitude: (point as { latitude: number }).latitude,
          longitude: (point as { longitude: number }).longitude,
          distanceMeters: typeof distanceMeters === "number" ? distanceMeters : null,
        },
      ];
    });
  } catch {
    return [];
  }
};

const epochMsToIso = (value: number | null): string | null =>
  value === null ? null : new Date(value).toISOString();
