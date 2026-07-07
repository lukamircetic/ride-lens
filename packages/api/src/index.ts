import { Schema } from "effect";
import * as Multipart from "effect/unstable/http/Multipart";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

export const HealthResponse = Schema.Struct({
  status: Schema.Literal("ok"),
});

export const FitImportPayload = Schema.Struct({
  file: Multipart.SingleFileSchema,
}).pipe(
  HttpApiSchema.asMultipart({
    maxFileSize: 50 * 1024 * 1024,
    maxTotalSize: 50 * 1024 * 1024,
    maxParts: 1,
  }),
);

export const ActivitySummary = Schema.Struct({
  startTime: Schema.NullOr(Schema.String),
  endTime: Schema.NullOr(Schema.String),
  sport: Schema.NullOr(Schema.String),
  subSport: Schema.NullOr(Schema.String),
  totalDistanceMeters: Schema.NullOr(Schema.Number),
  totalElapsedSeconds: Schema.NullOr(Schema.Number),
  totalTimerSeconds: Schema.NullOr(Schema.Number),
  totalMovingSeconds: Schema.NullOr(Schema.Number),
  totalAscentMeters: Schema.NullOr(Schema.Number),
  totalDescentMeters: Schema.NullOr(Schema.Number),
  calories: Schema.NullOr(Schema.Number),
  avgSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  maxSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  avgHeartRateBpm: Schema.NullOr(Schema.Number),
  maxHeartRateBpm: Schema.NullOr(Schema.Number),
  avgPowerWatts: Schema.NullOr(Schema.Number),
  maxPowerWatts: Schema.NullOr(Schema.Number),
  normalizedPowerWatts: Schema.NullOr(Schema.Number),
  avgCadenceRpm: Schema.NullOr(Schema.Number),
  startLatitude: Schema.NullOr(Schema.Number),
  startLongitude: Schema.NullOr(Schema.Number),
  recordCount: Schema.Number,
  lapCount: Schema.Number,
  sessionCount: Schema.Number,
  hasGps: Schema.Boolean,
});

export const FitImportResponse = Schema.Struct({
  importId: Schema.String,
  filename: Schema.String,
  source: Schema.Literal("fit"),
  status: Schema.Literal("parsed"),
  summary: ActivitySummary,
});

export type FitImportResponse = Schema.Schema.Type<typeof FitImportResponse>;

export const ActivityListItem = Schema.Struct({
  id: Schema.String,
  filename: Schema.String,
  source: Schema.Literal("fit"),
  importedAt: Schema.String,
  summary: ActivitySummary,
});

export const ActivityListResponse = Schema.Struct({
  activities: Schema.Array(ActivityListItem),
});

export const ActivityRoutePoint = Schema.Struct({
  recordIndex: Schema.Number,
  latitude: Schema.Number,
  longitude: Schema.Number,
  altitudeMeters: Schema.NullOr(Schema.Number),
  distanceMeters: Schema.NullOr(Schema.Number),
  speedMetersPerSecond: Schema.NullOr(Schema.Number),
  heartRateBpm: Schema.NullOr(Schema.Number),
});

export const ActivityRouteItem = Schema.Struct({
  activity: ActivityListItem,
  points: Schema.Array(ActivityRoutePoint),
});

export const ActivityRoutesResponse = Schema.Struct({
  routes: Schema.Array(ActivityRouteItem),
});

export const ActivityRecord = Schema.Struct({
  recordIndex: Schema.Number,
  timestamp: Schema.NullOr(Schema.String),
  latitude: Schema.NullOr(Schema.Number),
  longitude: Schema.NullOr(Schema.Number),
  altitudeMeters: Schema.NullOr(Schema.Number),
  distanceMeters: Schema.NullOr(Schema.Number),
  speedMetersPerSecond: Schema.NullOr(Schema.Number),
  heartRateBpm: Schema.NullOr(Schema.Number),
  cadenceRpm: Schema.NullOr(Schema.Number),
  powerWatts: Schema.NullOr(Schema.Number),
  temperatureCelsius: Schema.NullOr(Schema.Number),
  gradePercent: Schema.NullOr(Schema.Number),
  gpsAccuracyMeters: Schema.NullOr(Schema.Number),
});

export const ActivityLap = Schema.Struct({
  lapIndex: Schema.Number,
  startTime: Schema.NullOr(Schema.String),
  endTime: Schema.NullOr(Schema.String),
  totalDistanceMeters: Schema.NullOr(Schema.Number),
  totalElapsedSeconds: Schema.NullOr(Schema.Number),
  totalTimerSeconds: Schema.NullOr(Schema.Number),
  avgSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  maxSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  avgHeartRateBpm: Schema.NullOr(Schema.Number),
  maxHeartRateBpm: Schema.NullOr(Schema.Number),
  avgPowerWatts: Schema.NullOr(Schema.Number),
  maxPowerWatts: Schema.NullOr(Schema.Number),
  avgCadenceRpm: Schema.NullOr(Schema.Number),
  totalAscentMeters: Schema.NullOr(Schema.Number),
  totalDescentMeters: Schema.NullOr(Schema.Number),
  startLatitude: Schema.NullOr(Schema.Number),
  startLongitude: Schema.NullOr(Schema.Number),
  endLatitude: Schema.NullOr(Schema.Number),
  endLongitude: Schema.NullOr(Schema.Number),
});

export const ActivityDetailResponse = Schema.Struct({
  activity: ActivityListItem,
  records: Schema.Array(ActivityRecord),
  laps: Schema.Array(ActivityLap),
});

export type ActivityListResponse = Schema.Schema.Type<typeof ActivityListResponse>;
export type ActivityRoutesResponse = Schema.Schema.Type<typeof ActivityRoutesResponse>;
export type ActivityDetailResponse = Schema.Schema.Type<typeof ActivityDetailResponse>;

export const SystemApi = HttpApiGroup.make("system", { topLevel: true }).add(
  HttpApiEndpoint.get("health", "/health", {
    success: HealthResponse,
  }),
);

export const ActivityImportsApi = HttpApiGroup.make("activityImports", { topLevel: true }).add(
  HttpApiEndpoint.post("importFit", "/api/activities/import", {
    payload: FitImportPayload,
    success: FitImportResponse,
    error: [HttpApiError.BadRequestNoContent, HttpApiError.InternalServerErrorNoContent],
  }),
);

export const ActivitiesApi = HttpApiGroup.make("activities", { topLevel: true })
  .add(
    HttpApiEndpoint.get("listActivities", "/api/activities", {
      success: ActivityListResponse,
      error: HttpApiError.InternalServerErrorNoContent,
    }),
  )
  .add(
    HttpApiEndpoint.get("listActivityRoutes", "/api/activities/routes", {
      success: ActivityRoutesResponse,
      error: HttpApiError.InternalServerErrorNoContent,
    }),
  )
  .add(
    HttpApiEndpoint.get("getActivity", "/api/activities/:id", {
      params: {
        id: Schema.String,
      },
      success: ActivityDetailResponse,
      error: [HttpApiError.NotFoundNoContent, HttpApiError.InternalServerErrorNoContent],
    }),
  );

export class RideLensApi extends HttpApi.make("ride-lens-api")
  .add(SystemApi)
  .add(ActivityImportsApi)
  .add(ActivitiesApi)
  .annotateMerge(
    OpenApi.annotations({
      title: "Ride Lens API",
      version: "0.0.0",
    }),
  ) {}
