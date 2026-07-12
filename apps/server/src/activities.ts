import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
  FitImportResponse,
} from "@ride-lens/api";
import { RideLensDatabase } from "@ride-lens/db";
import { Context, Data, Effect, Layer } from "effect";
import {
  importFitActivity,
  ActivityImportInternalError,
  type ActivityInvalidFitError,
  type ImportFitActivityOptions,
} from "./activity-imports";
import {
  getActivityDetail,
  listActivityRoutes,
  listActivities,
  type ActivityNotFoundError,
  ActivityQueryError,
} from "./activity-queries";
import { matchExistingSegmentsForActivity } from "./segments";
import { claimMigratedOwnership } from "./ownership";
import { ensureActivityWeather, type WeatherConfig } from "./weather";

export class ActivityInvalidFileTypeError extends Data.TaggedError("ActivityInvalidFileTypeError")<{
  readonly filename: string;
}> {}

export class Activities extends Context.Service<
  Activities,
  {
    readonly importFit: (
      options: ImportFitActivityOptions,
    ) => Effect.Effect<
      FitImportResponse,
      ActivityInvalidFileTypeError | ActivityInvalidFitError | ActivityImportInternalError
    >;
    readonly list: (ownerUserId: string) => Effect.Effect<ActivityListResponse, ActivityQueryError>;
    readonly listRoutes: (
      ownerUserId: string,
    ) => Effect.Effect<ActivityRoutesResponse, ActivityQueryError>;
    readonly getDetail: (
      ownerUserId: string,
      activityId: string,
    ) => Effect.Effect<ActivityDetailResponse, ActivityNotFoundError | ActivityQueryError>;
  }
>()("@ride-lens/server/Activities") {
  static makeLayer(weatherConfig: WeatherConfig = {}) {
    return Layer.effect(
      Activities,
      Effect.gen(function* () {
        const database = yield* RideLensDatabase;

        return Activities.of({
          importFit: Effect.fn("Activities.importFit")(function* (
            options: ImportFitActivityOptions,
          ) {
            if (!isFitFilename(options.filename)) {
              return yield* Effect.fail(
                new ActivityInvalidFileTypeError({ filename: options.filename }),
              );
            }

            yield* claimMigratedOwnership(database, options.ownerUserId).pipe(
              Effect.mapError(
                (error) =>
                  new ActivityImportInternalError({
                    operation: "claim legacy ownership",
                    cause: error.cause,
                  }),
              ),
            );
            const imported = yield* importFitActivity(database, options);
            yield* ensureActivityWeather(database, imported.importId, weatherConfig).pipe(
              Effect.catchTag("WeatherContextError", () => Effect.succeed(null)),
            );
            yield* matchExistingSegmentsForActivity(
              database,
              options.ownerUserId,
              imported.importId,
            ).pipe(Effect.catchTag("SegmentQueryError", () => Effect.succeed(undefined)));

            return imported;
          }),
          list: Effect.fn("Activities.list")(function* (ownerUserId: string) {
            yield* claimMigratedOwnership(database, ownerUserId).pipe(
              Effect.mapError(
                (error) =>
                  new ActivityQueryError({
                    operation: "claim legacy ownership",
                    cause: error.cause,
                  }),
              ),
            );
            return yield* listActivities(database, ownerUserId);
          }),
          listRoutes: Effect.fn("Activities.listRoutes")(function* (ownerUserId: string) {
            yield* claimMigratedOwnership(database, ownerUserId).pipe(
              Effect.mapError(
                (error) =>
                  new ActivityQueryError({
                    operation: "claim legacy ownership",
                    cause: error.cause,
                  }),
              ),
            );
            return yield* listActivityRoutes(database, ownerUserId);
          }),
          getDetail: Effect.fn("Activities.getDetail")(function* (
            ownerUserId: string,
            activityId: string,
          ) {
            yield* claimMigratedOwnership(database, ownerUserId).pipe(
              Effect.mapError(
                (error) =>
                  new ActivityQueryError({
                    operation: "claim legacy ownership",
                    cause: error.cause,
                  }),
              ),
            );
            yield* getActivityDetail(database, ownerUserId, activityId);
            yield* ensureActivityWeather(database, activityId, weatherConfig).pipe(
              Effect.catchTag("WeatherContextError", () => Effect.succeed(null)),
            );
            return yield* getActivityDetail(database, ownerUserId, activityId);
          }),
        });
      }),
    );
  }

  static readonly layer = Activities.makeLayer();
}

const isFitFilename = (filename: string) => filename.toLowerCase().endsWith(".fit");
