import type { ActivityDetailResponse } from "@ride-lens/api";
import {
  activities,
  activity_records,
  activity_weather_summaries,
  weather_observations,
  type ActivityWeatherSummaryRow,
  type RideLensDatabaseService,
  type RideLensDrizzleDatabase,
} from "@ride-lens/db";
import { asc, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

const HOUR_MS = 60 * 60 * 1000;
const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const OPEN_METEO_PROVIDER = "open-meteo";
const OPEN_METEO_MODEL = "best_match";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const WIND_COMPONENT_THRESHOLD_MPS = 0.5;

export interface HistoricalWeatherRequest {
  readonly latitude: number;
  readonly longitude: number;
  readonly startDate: string;
  readonly endDate: string;
}

export interface WeatherClient {
  readonly fetchHistoricalWeather: (
    request: HistoricalWeatherRequest,
  ) => Promise<OpenMeteoArchiveResponse>;
}

export interface WeatherConfig {
  readonly enabled?: boolean | undefined;
  readonly client?: WeatherClient | undefined;
  readonly requestTimeoutMs?: number | undefined;
}

export class WeatherContextError extends Data.TaggedError("WeatherContextError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export interface OpenMeteoArchiveResponse {
  readonly latitude?: unknown;
  readonly longitude?: unknown;
  readonly hourly?: {
    readonly time?: ReadonlyArray<unknown>;
    readonly temperature_2m?: ReadonlyArray<unknown>;
    readonly precipitation?: ReadonlyArray<unknown>;
    readonly wind_speed_10m?: ReadonlyArray<unknown>;
    readonly wind_direction_10m?: ReadonlyArray<unknown>;
    readonly wind_gusts_10m?: ReadonlyArray<unknown>;
  };
}

interface ActivityForWeather {
  readonly id: string;
  readonly startTime: number | null;
  readonly endTime: number | null;
}

interface RecordForWeather {
  readonly timestamp: number | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly distanceMeters: number | null;
}

interface WeatherObservation {
  readonly timestamp: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly temperatureCelsius: number | null;
  readonly precipitationMillimeters: number | null;
  readonly windSpeedMetersPerSecond: number | null;
  readonly windDirectionDegrees: number | null;
  readonly windGustMetersPerSecond: number | null;
}

interface WeatherPreparation {
  readonly activity: ActivityForWeather;
  readonly records: ReadonlyArray<RecordForWeather>;
  readonly routeRecords: ReadonlyArray<RouteRecord>;
  readonly latitude: number;
  readonly longitude: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly startHour: number;
  readonly endHour: number;
}

interface RouteRecord {
  readonly timestamp: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceMeters: number | null;
}

interface WindComponentSample {
  readonly weight: number;
  readonly durationSeconds: number;
  readonly signedHeadwindMetersPerSecond: number;
  readonly crosswindMetersPerSecond: number;
  readonly airSpeedMetersPerSecond: number;
}

export const ensureActivityWeather = (
  database: RideLensDatabaseService,
  activityId: string,
  config: WeatherConfig = {},
): Effect.Effect<ActivityDetailResponse["weather"], WeatherContextError> =>
  Effect.gen(function* () {
    const existing = yield* loadCachedWeatherSummary(database.db, activityId);
    if (existing !== null && hasCompleteWeatherSummary(existing)) {
      return activityWeatherSummaryRowToResponse(existing);
    }

    if (config.enabled === false) {
      return existing === null ? null : activityWeatherSummaryRowToResponse(existing);
    }

    const prepared = yield* loadWeatherPreparation(database.db, activityId);
    if (prepared === null) {
      return null;
    }

    const client =
      config.client ??
      makeOpenMeteoWeatherClient(config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);

    const response = yield* Effect.tryPromise({
      try: () =>
        client.fetchHistoricalWeather({
          latitude: prepared.latitude,
          longitude: prepared.longitude,
          startDate: toDateKey(prepared.startHour),
          endDate: toDateKey(prepared.endHour),
        }),
      catch: (cause) => new WeatherContextError({ operation: "fetch historical weather", cause }),
    });

    const observations = parseOpenMeteoObservations(response, prepared);
    if (observations.length === 0) {
      return null;
    }

    const summary = buildWeatherSummary(prepared, observations, Date.now());
    yield* persistActivityWeather(database.db, prepared.activity.id, observations, summary);

    return activityWeatherSummaryRowToResponse(summary);
  });

export const activityWeatherSummaryRowToResponse = (
  summary: ActivityWeatherSummaryRow,
): ActivityDetailResponse["weather"] => ({
  provider: summary.provider,
  model: summary.model,
  latitude: summary.latitude,
  longitude: summary.longitude,
  startTime: epochMsToIso(summary.start_time),
  endTime: epochMsToIso(summary.end_time),
  observationCount: summary.observation_count,
  sampleCount: summary.sample_count,
  averageTemperatureCelsius: summary.average_temperature_celsius,
  totalPrecipitationMillimeters: summary.total_precipitation_millimeters,
  averageWindSpeedMetersPerSecond: summary.average_wind_speed_meters_per_second,
  maxWindGustMetersPerSecond: summary.max_wind_gust_meters_per_second,
  dominantWindDirectionDegrees: summary.dominant_wind_direction_degrees,
  averageAirSpeedMetersPerSecond: summary.average_air_speed_meters_per_second,
  averageHeadwindMetersPerSecond: summary.average_headwind_meters_per_second,
  maxHeadwindMetersPerSecond: summary.max_headwind_meters_per_second,
  maxTailwindMetersPerSecond: summary.max_tailwind_meters_per_second,
  averageCrosswindMetersPerSecond: summary.average_crosswind_meters_per_second,
  headwindDistanceMeters: summary.headwind_distance_meters,
  tailwindDistanceMeters: summary.tailwind_distance_meters,
  crosswindDistanceMeters: summary.crosswind_distance_meters,
  headwindSeconds: summary.headwind_seconds,
  tailwindSeconds: summary.tailwind_seconds,
  crosswindSeconds: summary.crosswind_seconds,
  longestHeadwindMeters: summary.longest_headwind_meters,
  headwindShare: summary.headwind_share,
  tailwindShare: summary.tailwind_share,
  crosswindShare: summary.crosswind_share,
  windBurdenScore: summary.wind_burden_score,
  computedAt: epochMsToIso(summary.computed_at),
});

export const makeOpenMeteoWeatherClient = (
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): WeatherClient => ({
  fetchHistoricalWeather: async (request) => {
    const url = new URL(OPEN_METEO_ARCHIVE_URL);
    url.searchParams.set("latitude", request.latitude.toFixed(5));
    url.searchParams.set("longitude", request.longitude.toFixed(5));
    url.searchParams.set("start_date", request.startDate);
    url.searchParams.set("end_date", request.endDate);
    url.searchParams.set(
      "hourly",
      [
        "temperature_2m",
        "precipitation",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
    );
    url.searchParams.set("wind_speed_unit", "ms");
    url.searchParams.set("timezone", "UTC");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Open-Meteo returned ${response.status}`);
      }

      return (await response.json()) as OpenMeteoArchiveResponse;
    } finally {
      clearTimeout(timeout);
    }
  },
});

const loadCachedWeatherSummary = (
  db: RideLensDrizzleDatabase,
  activityId: string,
): Effect.Effect<ActivityWeatherSummaryRow | null, WeatherContextError> =>
  Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(activity_weather_summaries)
        .where(eq(activity_weather_summaries.activity_id, activityId))
        .limit(1);

      return rows[0] ?? null;
    },
    catch: (cause) => new WeatherContextError({ operation: "load cached weather", cause }),
  });

const hasCompleteWeatherSummary = (summary: ActivityWeatherSummaryRow): boolean =>
  summary.sample_count === 0 ||
  (summary.average_air_speed_meters_per_second !== null &&
    summary.max_headwind_meters_per_second !== null &&
    summary.max_tailwind_meters_per_second !== null &&
    summary.headwind_distance_meters !== null &&
    summary.tailwind_distance_meters !== null &&
    summary.crosswind_distance_meters !== null &&
    summary.headwind_seconds !== null &&
    summary.tailwind_seconds !== null &&
    summary.crosswind_seconds !== null &&
    summary.longest_headwind_meters !== null);

const loadWeatherPreparation = (
  db: RideLensDrizzleDatabase,
  activityId: string,
): Effect.Effect<WeatherPreparation | null, WeatherContextError> =>
  Effect.tryPromise({
    try: async () => {
      const activityRows = await db
        .select({
          id: activities.id,
          startTime: activities.start_time,
          endTime: activities.end_time,
        })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      const activity = activityRows[0];
      if (!activity) {
        return null;
      }

      const records = await db
        .select({
          timestamp: activity_records.timestamp,
          latitude: activity_records.latitude,
          longitude: activity_records.longitude,
          distanceMeters: activity_records.distance_meters,
        })
        .from(activity_records)
        .where(eq(activity_records.activity_id, activityId))
        .orderBy(asc(activity_records.record_index));

      const routeRecords = records.filter(isRouteRecord);
      if (routeRecords.length === 0) {
        return null;
      }

      const startTime = activity.startTime ?? routeRecords[0]!.timestamp;
      const endTime = activity.endTime ?? routeRecords[routeRecords.length - 1]!.timestamp;
      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
        return null;
      }

      const center = averageCoordinate(routeRecords);
      return {
        activity,
        records,
        routeRecords,
        latitude: center.latitude,
        longitude: center.longitude,
        startTime,
        endTime,
        startHour: floorHour(startTime),
        endHour: floorHour(endTime),
      };
    },
    catch: (cause) => new WeatherContextError({ operation: "load activity weather input", cause }),
  });

const persistActivityWeather = (
  db: RideLensDrizzleDatabase,
  activityId: string,
  observations: ReadonlyArray<WeatherObservation>,
  summary: ActivityWeatherSummaryRow,
): Effect.Effect<void, WeatherContextError> =>
  Effect.tryPromise({
    try: async () => {
      await db.transaction(async (tx) => {
        await tx
          .delete(weather_observations)
          .where(eq(weather_observations.activity_id, activityId));
        await tx
          .delete(activity_weather_summaries)
          .where(eq(activity_weather_summaries.activity_id, activityId));

        await tx.insert(weather_observations).values(
          observations.map((observation) => ({
            activity_id: activityId,
            timestamp: observation.timestamp,
            latitude: observation.latitude,
            longitude: observation.longitude,
            temperature_celsius: observation.temperatureCelsius,
            precipitation_millimeters: observation.precipitationMillimeters,
            wind_speed_meters_per_second: observation.windSpeedMetersPerSecond,
            wind_direction_degrees: observation.windDirectionDegrees,
            wind_gust_meters_per_second: observation.windGustMetersPerSecond,
            provider: OPEN_METEO_PROVIDER,
            model: OPEN_METEO_MODEL,
            time_created: summary.computed_at,
          })),
        );
        await tx.insert(activity_weather_summaries).values(summary);
      });
    },
    catch: (cause) => new WeatherContextError({ operation: "persist weather context", cause }),
  });

const parseOpenMeteoObservations = (
  response: OpenMeteoArchiveResponse,
  prepared: WeatherPreparation,
): Array<WeatherObservation> => {
  const hourly = response.hourly;
  const times = hourly?.time;
  if (!Array.isArray(times)) return [];

  const responseLatitude = readNumber(response.latitude) ?? prepared.latitude;
  const responseLongitude = readNumber(response.longitude) ?? prepared.longitude;
  const observations: Array<WeatherObservation> = [];

  for (let index = 0; index < times.length; index += 1) {
    const timestamp = parseOpenMeteoTime(times[index]);
    if (timestamp === null || timestamp < prepared.startHour || timestamp > prepared.endHour) {
      continue;
    }

    observations.push({
      timestamp,
      latitude: responseLatitude,
      longitude: responseLongitude,
      temperatureCelsius: readNumberAt(hourly?.temperature_2m, index),
      precipitationMillimeters: readNumberAt(hourly?.precipitation, index),
      windSpeedMetersPerSecond: readNumberAt(hourly?.wind_speed_10m, index),
      windDirectionDegrees: normalizeDegrees(readNumberAt(hourly?.wind_direction_10m, index)),
      windGustMetersPerSecond: readNumberAt(hourly?.wind_gusts_10m, index),
    });
  }

  return observations;
};

const buildWeatherSummary = (
  prepared: WeatherPreparation,
  observations: ReadonlyArray<WeatherObservation>,
  computedAt: number,
): ActivityWeatherSummaryRow => {
  const observationsByHour = new Map(
    observations.map((observation) => [observation.timestamp, observation]),
  );
  const windSamples = buildWindComponentSamples(prepared.routeRecords, observationsByHour);
  const totalWeight = sum(windSamples.map((sample) => sample.weight));
  const averageHeadwind = weightedAverage(
    windSamples.map((sample) => ({
      value: sample.signedHeadwindMetersPerSecond,
      weight: sample.weight,
    })),
  );
  const averageCrosswind = weightedAverage(
    windSamples.map((sample) => ({
      value: sample.crosswindMetersPerSecond,
      weight: sample.weight,
    })),
  );
  const averageAirSpeed = weightedAverage(
    windSamples.map((sample) => ({
      value: sample.airSpeedMetersPerSecond,
      weight: sample.weight,
    })),
  );
  const windBuckets = summarizeWindBuckets(windSamples);
  const headwindDistanceMeters = windBuckets.headwindDistanceMeters ?? 0;
  const tailwindDistanceMeters = windBuckets.tailwindDistanceMeters ?? 0;
  const crosswindDistanceMeters = windBuckets.crosswindDistanceMeters ?? 0;

  return {
    activity_id: prepared.activity.id,
    provider: OPEN_METEO_PROVIDER,
    model: OPEN_METEO_MODEL,
    latitude: prepared.latitude,
    longitude: prepared.longitude,
    start_time: prepared.startTime,
    end_time: prepared.endTime,
    observation_count: observations.length,
    sample_count: windSamples.length,
    average_temperature_celsius: average(
      observations.map((observation) => observation.temperatureCelsius),
    ),
    total_precipitation_millimeters: sumNullable(
      observations.map((observation) => observation.precipitationMillimeters),
    ),
    average_wind_speed_meters_per_second: average(
      observations.map((observation) => observation.windSpeedMetersPerSecond),
    ),
    max_wind_gust_meters_per_second: maxNullable(
      observations.map((observation) => observation.windGustMetersPerSecond),
    ),
    dominant_wind_direction_degrees: dominantWindDirection(observations),
    average_air_speed_meters_per_second: averageAirSpeed,
    average_headwind_meters_per_second: averageHeadwind,
    max_headwind_meters_per_second: maxHeadwind(windSamples),
    max_tailwind_meters_per_second: maxTailwind(windSamples),
    average_crosswind_meters_per_second: averageCrosswind,
    headwind_distance_meters: windBuckets.headwindDistanceMeters,
    tailwind_distance_meters: windBuckets.tailwindDistanceMeters,
    crosswind_distance_meters: windBuckets.crosswindDistanceMeters,
    headwind_seconds: windBuckets.headwindSeconds,
    tailwind_seconds: windBuckets.tailwindSeconds,
    crosswind_seconds: windBuckets.crosswindSeconds,
    longest_headwind_meters: windBuckets.longestHeadwindMeters,
    headwind_share: totalWeight === 0 ? null : headwindDistanceMeters / totalWeight,
    tailwind_share: totalWeight === 0 ? null : tailwindDistanceMeters / totalWeight,
    crosswind_share: totalWeight === 0 ? null : crosswindDistanceMeters / totalWeight,
    wind_burden_score:
      averageHeadwind === null
        ? null
        : clamp((averageHeadwind + (averageCrosswind ?? 0) * 0.25) * 18, -100, 100),
    computed_at: computedAt,
  };
};

const buildWindComponentSamples = (
  records: ReadonlyArray<RouteRecord>,
  observationsByHour: ReadonlyMap<number, WeatherObservation>,
): Array<WindComponentSample> => {
  const samples: Array<WindComponentSample> = [];
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1]!;
    const current = records[index]!;
    const observation = observationsByHour.get(floorHour(current.timestamp));
    if (
      !observation ||
      observation.windSpeedMetersPerSecond === null ||
      observation.windDirectionDegrees === null
    ) {
      continue;
    }

    const bearing = bearingDegrees(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
    const windTowardDegrees = normalizeDegrees(observation.windDirectionDegrees + 180);
    const componentAngle = degreesToRadians(angleDifferenceDegrees(windTowardDegrees, bearing));
    const tailwindMetersPerSecond = observation.windSpeedMetersPerSecond * Math.cos(componentAngle);
    const crosswindMetersPerSecond = Math.abs(
      observation.windSpeedMetersPerSecond * Math.sin(componentAngle),
    );
    const weight = segmentWeight(previous, current);
    const durationSeconds = segmentDurationSeconds(previous, current);
    const groundSpeedMetersPerSecond =
      durationSeconds > 0 ? weight / durationSeconds : currentGroundSpeed(previous, current);
    const signedHeadwindMetersPerSecond = -tailwindMetersPerSecond;

    samples.push({
      weight,
      durationSeconds,
      signedHeadwindMetersPerSecond,
      crosswindMetersPerSecond,
      airSpeedMetersPerSecond: Math.hypot(
        groundSpeedMetersPerSecond + signedHeadwindMetersPerSecond,
        crosswindMetersPerSecond,
      ),
    });
  }

  return samples;
};

const summarizeWindBuckets = (samples: ReadonlyArray<WindComponentSample>) => {
  let headwindDistanceMeters = 0;
  let tailwindDistanceMeters = 0;
  let crosswindDistanceMeters = 0;
  let headwindSeconds = 0;
  let tailwindSeconds = 0;
  let crosswindSeconds = 0;
  let currentHeadwindMeters = 0;
  let longestHeadwindMeters = 0;

  for (const sample of samples) {
    const headwind = sample.signedHeadwindMetersPerSecond;
    if (headwind > WIND_COMPONENT_THRESHOLD_MPS) {
      headwindDistanceMeters += sample.weight;
      headwindSeconds += sample.durationSeconds;
      currentHeadwindMeters += sample.weight;
      longestHeadwindMeters = Math.max(longestHeadwindMeters, currentHeadwindMeters);
    } else {
      currentHeadwindMeters = 0;
      if (headwind < -WIND_COMPONENT_THRESHOLD_MPS) {
        tailwindDistanceMeters += sample.weight;
        tailwindSeconds += sample.durationSeconds;
      } else {
        crosswindDistanceMeters += sample.weight;
        crosswindSeconds += sample.durationSeconds;
      }
    }
  }

  return {
    headwindDistanceMeters: samples.length === 0 ? null : headwindDistanceMeters,
    tailwindDistanceMeters: samples.length === 0 ? null : tailwindDistanceMeters,
    crosswindDistanceMeters: samples.length === 0 ? null : crosswindDistanceMeters,
    headwindSeconds: samples.length === 0 ? null : headwindSeconds,
    tailwindSeconds: samples.length === 0 ? null : tailwindSeconds,
    crosswindSeconds: samples.length === 0 ? null : crosswindSeconds,
    longestHeadwindMeters: samples.length === 0 ? null : longestHeadwindMeters,
  };
};

const maxHeadwind = (samples: ReadonlyArray<WindComponentSample>): number | null =>
  maxNullable(samples.map((sample) => Math.max(0, sample.signedHeadwindMetersPerSecond)));

const maxTailwind = (samples: ReadonlyArray<WindComponentSample>): number | null =>
  maxNullable(samples.map((sample) => Math.max(0, -sample.signedHeadwindMetersPerSecond)));

const isRouteRecord = (record: RecordForWeather): record is RouteRecord =>
  record.timestamp !== null &&
  record.latitude !== null &&
  record.longitude !== null &&
  Number.isFinite(record.timestamp) &&
  Number.isFinite(record.latitude) &&
  Number.isFinite(record.longitude);

const averageCoordinate = (records: ReadonlyArray<RouteRecord>) => {
  const latitude = sum(records.map((record) => record.latitude)) / records.length;
  const longitude = sum(records.map((record) => record.longitude)) / records.length;
  return { latitude, longitude };
};

const segmentWeight = (previous: RouteRecord, current: RouteRecord): number => {
  const distanceDelta =
    previous.distanceMeters !== null && current.distanceMeters !== null
      ? current.distanceMeters - previous.distanceMeters
      : null;
  if (distanceDelta !== null && Number.isFinite(distanceDelta) && distanceDelta > 0) {
    return distanceDelta;
  }

  return Math.max(
    1,
    haversineMeters(previous.latitude, previous.longitude, current.latitude, current.longitude),
  );
};

const segmentDurationSeconds = (previous: RouteRecord, current: RouteRecord): number => {
  const durationSeconds = (current.timestamp - previous.timestamp) / 1000;
  return Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
};

const currentGroundSpeed = (previous: RouteRecord, current: RouteRecord): number => {
  const durationSeconds = segmentDurationSeconds(previous, current);
  return durationSeconds > 0 ? segmentWeight(previous, current) / durationSeconds : 0;
};

const bearingDegrees = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number => {
  const phi1 = degreesToRadians(fromLatitude);
  const phi2 = degreesToRadians(toLatitude);
  const deltaLambda = degreesToRadians(toLongitude - fromLongitude);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return normalizeDegrees(radiansToDegrees(Math.atan2(y, x))) ?? 0;
};

const haversineMeters = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number => {
  const earthRadiusMeters = 6_371_000;
  const deltaLatitude = degreesToRadians(toLatitude - fromLatitude);
  const deltaLongitude = degreesToRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = degreesToRadians(fromLatitude);
  const toLatitudeRadians = degreesToRadians(toLatitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const dominantWindDirection = (observations: ReadonlyArray<WeatherObservation>): number | null => {
  let x = 0;
  let y = 0;
  for (const observation of observations) {
    if (observation.windDirectionDegrees === null) continue;
    const weight = observation.windSpeedMetersPerSecond ?? 1;
    const radians = degreesToRadians(observation.windDirectionDegrees);
    x += Math.sin(radians) * weight;
    y += Math.cos(radians) * weight;
  }

  if (x === 0 && y === 0) return null;
  return normalizeDegrees(radiansToDegrees(Math.atan2(x, y)));
};

const weightedAverage = (
  values: ReadonlyArray<{ readonly value: number; readonly weight: number }>,
): number | null => {
  const usable = values.filter(
    (item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0,
  );
  const totalWeight = sum(usable.map((item) => item.weight));
  if (totalWeight === 0) return null;
  return sum(usable.map((item) => item.value * item.weight)) / totalWeight;
};

const average = (values: ReadonlyArray<number | null>): number | null => {
  const usable = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  return usable.length === 0 ? null : sum(usable) / usable.length;
};

const maxNullable = (values: ReadonlyArray<number | null>): number | null => {
  const usable = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  return usable.length === 0 ? null : Math.max(...usable);
};

const sumNullable = (values: ReadonlyArray<number | null>): number | null => {
  const usable = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  return usable.length === 0 ? null : sum(usable);
};

const sum = (values: ReadonlyArray<number>): number =>
  values.reduce((total, value) => total + value, 0);

const readNumberAt = (values: ReadonlyArray<unknown> | undefined, index: number): number | null =>
  Array.isArray(values) ? readNumber(values[index]) : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const floorHour = (value: number): number => Math.floor(value / HOUR_MS) * HOUR_MS;

const toDateKey = (value: number): string => new Date(value).toISOString().slice(0, 10);

const parseOpenMeteoTime = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isFinite(parsed) ? parsed : null;
};

const epochMsToIso = (value: number): string => new Date(value).toISOString();

const normalizeDegrees = (value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
};

const angleDifferenceDegrees = (a: number | null, b: number | null): number => {
  const normalizedA = normalizeDegrees(a);
  const normalizedB = normalizeDegrees(b);
  if (normalizedA === null || normalizedB === null) return 0;
  return ((((normalizedA - normalizedB) % 360) + 540) % 360) - 180;
};

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

const radiansToDegrees = (value: number): number => (value * 180) / Math.PI;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));
