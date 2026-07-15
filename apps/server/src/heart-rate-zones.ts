import type {
  HeartRateZoneDistribution,
  HeartRateZoneProfileResponse,
  HeartRateZoneSeasonResponse,
  SaveHeartRateZoneProfilePayload,
} from "@ride-lens/api";
import {
  activities,
  activity_records,
  heart_rate_zone_profiles,
  RideLensDatabase,
  type HeartRateZoneProfileRow,
  type RideLensDatabaseService,
} from "@ride-lens/db";
import {
  calculateHeartRateZoneDistribution,
  combineHeartRateZoneDistributions,
  resolveHeartRateZones,
} from "@ride-lens/heart-rate-zones";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";

export class HeartRateZoneValidationError extends Data.TaggedError("HeartRateZoneValidationError")<{
  readonly message: string;
}> {}

export class HeartRateZoneQueryError extends Data.TaggedError("HeartRateZoneQueryError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export class HeartRateZones extends Context.Service<
  HeartRateZones,
  {
    readonly getProfile: (
      ownerUserId: string,
    ) => Effect.Effect<HeartRateZoneProfileResponse, HeartRateZoneQueryError>;
    readonly saveProfile: (
      ownerUserId: string,
      payload: SaveHeartRateZoneProfilePayload,
    ) => Effect.Effect<
      HeartRateZoneProfileResponse,
      HeartRateZoneValidationError | HeartRateZoneQueryError
    >;
    readonly getSeason: (
      ownerUserId: string,
      year: number,
    ) => Effect.Effect<
      HeartRateZoneSeasonResponse,
      HeartRateZoneValidationError | HeartRateZoneQueryError
    >;
  }
>()("@ride-lens/server/HeartRateZones") {
  static readonly layer = Layer.effect(
    HeartRateZones,
    Effect.gen(function* () {
      const database = yield* RideLensDatabase;

      return HeartRateZones.of({
        getProfile: Effect.fn("HeartRateZones.getProfile")(function* (ownerUserId: string) {
          return yield* getHeartRateZoneProfile(database, ownerUserId);
        }),
        saveProfile: Effect.fn("HeartRateZones.saveProfile")(function* (
          ownerUserId: string,
          payload: SaveHeartRateZoneProfilePayload,
        ) {
          const values = yield* validateProfilePayload(payload);
          const now = Date.now();

          yield* Effect.tryPromise({
            try: () =>
              database.db
                .insert(heart_rate_zone_profiles)
                .values({
                  id: crypto.randomUUID(),
                  owner_user_id: ownerUserId,
                  sport: "cycling",
                  method: payload.method,
                  maximum_heart_rate_bpm: payload.maximumHeartRateBpm,
                  maximum_heart_rate_source: payload.maximumHeartRateSource,
                  resting_heart_rate_bpm: payload.restingHeartRateBpm,
                  zone_1_lower_bpm: values.lowerBounds[0]!,
                  zone_2_lower_bpm: values.lowerBounds[1]!,
                  zone_3_lower_bpm: values.lowerBounds[2]!,
                  zone_4_lower_bpm: values.lowerBounds[3]!,
                  zone_5_lower_bpm: values.lowerBounds[4]!,
                  time_created: now,
                  time_updated: now,
                })
                .onConflictDoUpdate({
                  target: [heart_rate_zone_profiles.owner_user_id, heart_rate_zone_profiles.sport],
                  set: {
                    method: payload.method,
                    maximum_heart_rate_bpm: payload.maximumHeartRateBpm,
                    maximum_heart_rate_source: payload.maximumHeartRateSource,
                    resting_heart_rate_bpm: payload.restingHeartRateBpm,
                    zone_1_lower_bpm: values.lowerBounds[0]!,
                    zone_2_lower_bpm: values.lowerBounds[1]!,
                    zone_3_lower_bpm: values.lowerBounds[2]!,
                    zone_4_lower_bpm: values.lowerBounds[3]!,
                    zone_5_lower_bpm: values.lowerBounds[4]!,
                    time_updated: now,
                  },
                }),
            catch: (cause) =>
              new HeartRateZoneQueryError({
                operation: "Failed to save heart-rate zone profile",
                cause,
              }),
          });

          return yield* getHeartRateZoneProfile(database, ownerUserId);
        }),
        getSeason: Effect.fn("HeartRateZones.getSeason")(function* (
          ownerUserId: string,
          year: number,
        ) {
          if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return yield* Effect.fail(
              new HeartRateZoneValidationError({ message: "Year must be from 2000 to 2100" }),
            );
          }

          const profileResponse = yield* getHeartRateZoneProfile(database, ownerUserId);
          const profile = profileResponse.profile;
          const seasonData = yield* queryHeartRateZoneSeasonData(
            database,
            ownerUserId,
            year,
            profile !== null,
          );
          if (profile === null) {
            return {
              year,
              profile: null,
              rideCount: seasonData.activities.length,
              distribution: null,
              weeks: [],
            };
          }

          const recordsByActivity = new Map<string, Array<SeasonHeartRateRecord>>();
          for (const record of seasonData.records) {
            const records = recordsByActivity.get(record.activityId) ?? [];
            records.push(record);
            recordsByActivity.set(record.activityId, records);
          }

          const activityDistributions = seasonData.activities.map((activity) => ({
            activity,
            distribution: calculateHeartRateZoneDistribution(
              recordsByActivity.get(activity.id) ?? [],
              profile.zones,
              activity.totalTimerSeconds,
            ),
          }));

          return {
            year,
            profile,
            rideCount: seasonData.activities.length,
            distribution: combineHeartRateZoneDistributions(
              activityDistributions.map(({ distribution }) => distribution),
              profile.zones,
            ),
            weeks: combineWeeklyDistributions(activityDistributions),
          };
        }),
      });
    }),
  );
}

export const getHeartRateZoneProfile = (
  database: RideLensDatabaseService,
  ownerUserId: string,
): Effect.Effect<HeartRateZoneProfileResponse, HeartRateZoneQueryError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await database.db
        .select()
        .from(heart_rate_zone_profiles)
        .where(
          and(
            eq(heart_rate_zone_profiles.owner_user_id, ownerUserId),
            eq(heart_rate_zone_profiles.sport, "cycling"),
          ),
        )
        .limit(1);

      return { profile: rows[0] ? profileRowToResponse(rows[0]) : null };
    },
    catch: (cause) =>
      new HeartRateZoneQueryError({
        operation: "Failed to load heart-rate zone profile",
        cause,
      }),
  });

export function profileRowToResponse(
  row: HeartRateZoneProfileRow,
): NonNullable<HeartRateZoneProfileResponse["profile"]> {
  const lowerBounds = profileRowLowerBounds(row);
  const zones = resolveHeartRateZones({
    method: "custom",
    maximumHeartRateBpm: null,
    restingHeartRateBpm: null,
    customLowerBoundsBpm: lowerBounds,
  });

  return {
    id: row.id,
    sport: "cycling",
    method: row.method,
    maximumHeartRateBpm: row.maximum_heart_rate_bpm,
    maximumHeartRateSource: row.maximum_heart_rate_source,
    restingHeartRateBpm: row.resting_heart_rate_bpm,
    customLowerBoundsBpm: row.method === "custom" ? lowerBounds : null,
    zones,
    updatedAt: new Date(row.time_updated).toISOString(),
  };
}

export const profileRowLowerBounds = (
  row: HeartRateZoneProfileRow,
): readonly [number, number, number, number, number] => [
  row.zone_1_lower_bpm,
  row.zone_2_lower_bpm,
  row.zone_3_lower_bpm,
  row.zone_4_lower_bpm,
  row.zone_5_lower_bpm,
];

const validateProfilePayload = (
  payload: SaveHeartRateZoneProfilePayload,
): Effect.Effect<
  { readonly lowerBounds: readonly [number, number, number, number, number] },
  HeartRateZoneValidationError
> =>
  Effect.try({
    try: () => {
      if (payload.method === "custom") {
        if (
          payload.maximumHeartRateBpm !== null ||
          payload.maximumHeartRateSource !== null ||
          payload.restingHeartRateBpm !== null
        ) {
          throw new RangeError("Custom profiles only accept BPM boundaries");
        }
      } else {
        assertWholeHeartRate(payload.maximumHeartRateBpm, 80, 240, "Maximum heart rate");
        if (payload.maximumHeartRateSource === null) {
          throw new RangeError("Maximum heart-rate source is required");
        }
        if (payload.customLowerBoundsBpm !== null) {
          throw new RangeError("Calculated profiles cannot include custom boundaries");
        }
      }

      if (payload.method === "heartRateReserve") {
        assertWholeHeartRate(payload.restingHeartRateBpm, 30, 150, "Resting heart rate");
      } else if (payload.restingHeartRateBpm !== null) {
        throw new RangeError("Resting heart rate is only used by heart-rate reserve");
      }

      if (payload.method === "custom") {
        if (!payload.customLowerBoundsBpm || payload.customLowerBoundsBpm.length !== 5) {
          throw new RangeError("Custom profiles require five boundaries");
        }
        for (const boundary of payload.customLowerBoundsBpm) {
          assertWholeHeartRate(boundary, 40, 240, "Zone boundary");
        }
      }

      const zones = resolveHeartRateZones(payload);
      return {
        lowerBounds: zones.map(({ lowerBpm }) => lowerBpm) as unknown as readonly [
          number,
          number,
          number,
          number,
          number,
        ],
      };
    },
    catch: (cause) =>
      new HeartRateZoneValidationError({
        message: cause instanceof Error ? cause.message : "Invalid heart-rate zone profile",
      }),
  });

function assertWholeHeartRate(
  value: number | null,
  minimum: number,
  maximum: number,
  label: string,
): asserts value is number {
  if (!Number.isInteger(value) || value === null || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be a whole number from ${minimum} to ${maximum} bpm`);
  }
}

interface SeasonActivity {
  readonly id: string;
  readonly startTime: number;
  readonly totalTimerSeconds: number | null;
}

interface SeasonHeartRateRecord {
  readonly activityId: string;
  readonly timestampMs: number | null;
  readonly heartRateBpm: number | null;
}

const queryHeartRateZoneSeasonData = (
  database: RideLensDatabaseService,
  ownerUserId: string,
  year: number,
  includeRecords: boolean,
) =>
  Effect.tryPromise({
    try: async () => {
      const start = Date.UTC(year, 0, 1);
      const end = Date.UTC(year + 1, 0, 1);
      const ownerYear = and(
        eq(activities.owner_user_id, ownerUserId),
        eq(activities.sport, "cycling"),
        gte(activities.start_time, start),
        lt(activities.start_time, end),
      );
      const [activityRows, recordRows] = await Promise.all([
        database.db
          .select({
            id: activities.id,
            startTime: activities.start_time,
            totalTimerSeconds: activities.total_timer_seconds,
          })
          .from(activities)
          .where(ownerYear)
          .orderBy(asc(activities.start_time)),
        includeRecords
          ? database.db
              .select({
                activityId: activity_records.activity_id,
                timestampMs: activity_records.timestamp,
                heartRateBpm: activity_records.heart_rate_bpm,
              })
              .from(activity_records)
              .innerJoin(activities, eq(activity_records.activity_id, activities.id))
              .where(ownerYear)
              .orderBy(asc(activity_records.activity_id), asc(activity_records.record_index))
          : Promise.resolve([]),
      ]);

      return {
        activities: activityRows.flatMap(
          (activity): Array<SeasonActivity> =>
            activity.startTime === null
              ? []
              : [
                  {
                    id: activity.id,
                    startTime: activity.startTime,
                    totalTimerSeconds: activity.totalTimerSeconds,
                  },
                ],
        ),
        records: recordRows,
      };
    },
    catch: (cause) =>
      new HeartRateZoneQueryError({
        operation: "Failed to load heart-rate zone season",
        cause,
      }),
  });

function combineWeeklyDistributions(
  activitiesWithDistribution: ReadonlyArray<{
    readonly activity: SeasonActivity;
    readonly distribution: HeartRateZoneDistribution;
  }>,
): HeartRateZoneSeasonResponse["weeks"] {
  const weeks = new Map<string, Array<number>>();
  for (const { activity, distribution } of activitiesWithDistribution) {
    if (distribution.classifiedSeconds === 0) continue;
    const weekStart = toIsoWeekStart(activity.startTime);
    const seconds = weeks.get(weekStart) ?? [0, 0, 0, 0, 0];
    for (const zone of distribution.zones) {
      seconds[zone.number - 1] = (seconds[zone.number - 1] ?? 0) + zone.seconds;
    }
    weeks.set(weekStart, seconds);
  }

  return [...weeks.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekStart, seconds]) => ({
      weekStart,
      zones: seconds.map((value, index) => ({
        number: (index + 1) as 1 | 2 | 3 | 4 | 5,
        seconds: value,
      })),
    }));
}

function toIsoWeekStart(timestampMs: number): string {
  const date = new Date(timestampMs);
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}
