import { Context, Schema } from "effect";
import * as Multipart from "effect/unstable/http/Multipart";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

export class CurrentUser extends Context.Service<
  CurrentUser,
  {
    readonly id: string;
    readonly provider: "better-auth";
  }
>()("@ride-lens/api/CurrentUser") {}

export class AuthMiddleware extends HttpApiMiddleware.Service<
  AuthMiddleware,
  { provides: CurrentUser }
>()("@ride-lens/api/AuthMiddleware", {
  error: HttpApiError.UnauthorizedNoContent,
}) {}

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

export const ActivityWeatherSummary = Schema.Struct({
  provider: Schema.String,
  model: Schema.NullOr(Schema.String),
  latitude: Schema.Number,
  longitude: Schema.Number,
  startTime: Schema.String,
  endTime: Schema.String,
  observationCount: Schema.Number,
  sampleCount: Schema.Number,
  averageTemperatureCelsius: Schema.NullOr(Schema.Number),
  totalPrecipitationMillimeters: Schema.NullOr(Schema.Number),
  averageWindSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  maxWindGustMetersPerSecond: Schema.NullOr(Schema.Number),
  dominantWindDirectionDegrees: Schema.NullOr(Schema.Number),
  averageAirSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  averageHeadwindMetersPerSecond: Schema.NullOr(Schema.Number),
  maxHeadwindMetersPerSecond: Schema.NullOr(Schema.Number),
  maxTailwindMetersPerSecond: Schema.NullOr(Schema.Number),
  averageCrosswindMetersPerSecond: Schema.NullOr(Schema.Number),
  headwindDistanceMeters: Schema.NullOr(Schema.Number),
  tailwindDistanceMeters: Schema.NullOr(Schema.Number),
  crosswindDistanceMeters: Schema.NullOr(Schema.Number),
  headwindSeconds: Schema.NullOr(Schema.Number),
  tailwindSeconds: Schema.NullOr(Schema.Number),
  crosswindSeconds: Schema.NullOr(Schema.Number),
  longestHeadwindMeters: Schema.NullOr(Schema.Number),
  headwindShare: Schema.NullOr(Schema.Number),
  tailwindShare: Schema.NullOr(Schema.Number),
  crosswindShare: Schema.NullOr(Schema.Number),
  windBurdenScore: Schema.NullOr(Schema.Number),
  computedAt: Schema.String,
});

export const SegmentStats = Schema.Struct({
  distanceMeters: Schema.NullOr(Schema.Number),
  elapsedSeconds: Schema.NullOr(Schema.Number),
  movingSeconds: Schema.NullOr(Schema.Number),
  averageSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  maxSpeedMetersPerSecond: Schema.NullOr(Schema.Number),
  averageHeartRateBpm: Schema.NullOr(Schema.Number),
  maxHeartRateBpm: Schema.NullOr(Schema.Number),
  elevationGainMeters: Schema.NullOr(Schema.Number),
  elevationLossMeters: Schema.NullOr(Schema.Number),
  vamMetersPerHour: Schema.NullOr(Schema.Number),
  averageCadenceRpm: Schema.NullOr(Schema.Number),
  averagePowerWatts: Schema.NullOr(Schema.Number),
  normalizedPowerWatts: Schema.NullOr(Schema.Number),
});

export const SegmentGeometryPoint = Schema.Struct({
  recordIndex: Schema.Number,
  latitude: Schema.Number,
  longitude: Schema.Number,
  distanceMeters: Schema.NullOr(Schema.Number),
});

export const Segment = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  source: Schema.Literal("manual"),
  sport: Schema.NullOr(Schema.String),
  sourceActivityId: Schema.String,
  startRecordIndex: Schema.Number,
  endRecordIndex: Schema.Number,
  startDistanceMeters: Schema.NullOr(Schema.Number),
  endDistanceMeters: Schema.NullOr(Schema.Number),
  startTime: Schema.NullOr(Schema.String),
  endTime: Schema.NullOr(Schema.String),
  startLatitude: Schema.NullOr(Schema.Number),
  startLongitude: Schema.NullOr(Schema.Number),
  endLatitude: Schema.NullOr(Schema.Number),
  endLongitude: Schema.NullOr(Schema.Number),
  stats: SegmentStats,
  geometry: Schema.Array(SegmentGeometryPoint),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const SegmentEffort = Schema.Struct({
  id: Schema.String,
  segmentId: Schema.String,
  activityId: Schema.String,
  activity: ActivityListItem,
  attemptIndex: Schema.Number,
  source: Schema.Union([Schema.Literal("source"), Schema.Literal("matched")]),
  startRecordIndex: Schema.Number,
  endRecordIndex: Schema.Number,
  startDistanceMeters: Schema.NullOr(Schema.Number),
  endDistanceMeters: Schema.NullOr(Schema.Number),
  startTime: Schema.NullOr(Schema.String),
  endTime: Schema.NullOr(Schema.String),
  stats: SegmentStats,
  coverageRatio: Schema.Number,
  confidence: Schema.Number,
  averageDeviationMeters: Schema.NullOr(Schema.Number),
  maxDeviationMeters: Schema.NullOr(Schema.Number),
  computedAt: Schema.String,
});

export const SegmentWithEfforts = Schema.Struct({
  segment: Segment,
  efforts: Schema.Array(SegmentEffort),
});

export const ActivitySegment = Schema.Struct({
  segment: Segment,
  effort: SegmentEffort,
});

export const CreateSegmentPayload = Schema.Struct({
  activityId: Schema.String,
  name: Schema.String,
  startRecordIndex: Schema.Number,
  endRecordIndex: Schema.Number,
});

export const UpdateSegmentPayload = Schema.Struct({
  name: Schema.String,
  startRecordIndex: Schema.Number,
  endRecordIndex: Schema.Number,
});

export const SegmentDetailResponse = SegmentWithEfforts;

export const SegmentListResponse = Schema.Struct({
  segments: Schema.Array(SegmentWithEfforts),
});

export const ActivitySegmentsResponse = Schema.Struct({
  segments: Schema.Array(ActivitySegment),
});

export const ActivityDetailResponse = Schema.Struct({
  activity: ActivityListItem,
  records: Schema.Array(ActivityRecord),
  laps: Schema.Array(ActivityLap),
  weather: Schema.NullOr(ActivityWeatherSummary),
});

export type ActivityListResponse = Schema.Schema.Type<typeof ActivityListResponse>;
export type ActivityRoutesResponse = Schema.Schema.Type<typeof ActivityRoutesResponse>;
export type ActivityDetailResponse = Schema.Schema.Type<typeof ActivityDetailResponse>;
export type CreateSegmentPayload = Schema.Schema.Type<typeof CreateSegmentPayload>;
export type UpdateSegmentPayload = Schema.Schema.Type<typeof UpdateSegmentPayload>;
export type SegmentDetailResponse = Schema.Schema.Type<typeof SegmentDetailResponse>;
export type SegmentListResponse = Schema.Schema.Type<typeof SegmentListResponse>;
export type ActivitySegmentsResponse = Schema.Schema.Type<typeof ActivitySegmentsResponse>;

export const decodeFitImportResponse = Schema.decodeUnknownPromise(FitImportResponse);
export const decodeActivityListResponse = Schema.decodeUnknownPromise(ActivityListResponse);
export const decodeActivityRoutesResponse = Schema.decodeUnknownPromise(ActivityRoutesResponse);
export const decodeActivityDetailResponse = Schema.decodeUnknownPromise(ActivityDetailResponse);
export const decodeSegmentDetailResponse = Schema.decodeUnknownPromise(SegmentDetailResponse);
export const decodeSegmentListResponse = Schema.decodeUnknownPromise(SegmentListResponse);
export const decodeActivitySegmentsResponse = Schema.decodeUnknownPromise(ActivitySegmentsResponse);

export const SystemApi = HttpApiGroup.make("system", { topLevel: true }).add(
  HttpApiEndpoint.get("health", "/health", {
    success: HealthResponse,
  }),
);

export const ActivityImportsApi = HttpApiGroup.make("activityImports", { topLevel: true })
  .add(
    HttpApiEndpoint.post("importFit", "/api/activities/import", {
      payload: FitImportPayload,
      success: FitImportResponse,
      error: [HttpApiError.BadRequestNoContent, HttpApiError.InternalServerErrorNoContent],
    }),
  )
  .middleware(AuthMiddleware);

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
  )
  .middleware(AuthMiddleware);

export const SegmentsApi = HttpApiGroup.make("segments", { topLevel: true })
  .add(
    HttpApiEndpoint.get("listSegments", "/api/segments", {
      success: SegmentListResponse,
      error: HttpApiError.InternalServerErrorNoContent,
    }),
  )
  .add(
    HttpApiEndpoint.post("createSegment", "/api/segments", {
      payload: CreateSegmentPayload,
      success: SegmentDetailResponse,
      error: [HttpApiError.BadRequestNoContent, HttpApiError.InternalServerErrorNoContent],
    }),
  )
  .add(
    HttpApiEndpoint.patch("updateSegment", "/api/segments/:id", {
      params: {
        id: Schema.String,
      },
      payload: UpdateSegmentPayload,
      success: SegmentDetailResponse,
      error: [
        HttpApiError.BadRequestNoContent,
        HttpApiError.NotFoundNoContent,
        HttpApiError.InternalServerErrorNoContent,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.get("listActivitySegments", "/api/activities/:id/segments", {
      params: {
        id: Schema.String,
      },
      success: ActivitySegmentsResponse,
      error: HttpApiError.InternalServerErrorNoContent,
    }),
  )
  .middleware(AuthMiddleware);

export class RideLensApi extends HttpApi.make("ride-lens-api")
  .add(SystemApi)
  .add(ActivityImportsApi)
  .add(ActivitiesApi)
  .add(SegmentsApi)
  .annotateMerge(
    OpenApi.annotations({
      title: "Ride Lens API",
      version: "0.0.0",
    }),
  ) {}
