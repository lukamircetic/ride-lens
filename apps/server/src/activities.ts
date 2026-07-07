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
  type ActivityImportInternalError,
  type ActivityInvalidFitError,
  type ImportFitActivityOptions,
} from "./activity-imports";
import {
  getActivityDetail,
  listActivityRoutes,
  listActivities,
  type ActivityNotFoundError,
  type ActivityQueryError,
} from "./activity-queries";
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
    readonly list: () => Effect.Effect<ActivityListResponse, ActivityQueryError>;
    readonly listRoutes: () => Effect.Effect<ActivityRoutesResponse, ActivityQueryError>;
    readonly getDetail: (
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

            const imported = yield* importFitActivity(database, options);
            yield* ensureActivityWeather(database, imported.importId, weatherConfig).pipe(
              Effect.catchTag("WeatherContextError", () => Effect.succeed(null)),
            );

            return imported;
          }),
          list: Effect.fn("Activities.list")(function* () {
            return yield* listActivities(database);
          }),
          listRoutes: Effect.fn("Activities.listRoutes")(function* () {
            return yield* listActivityRoutes(database);
          }),
          getDetail: Effect.fn("Activities.getDetail")(function* (activityId: string) {
            yield* ensureActivityWeather(database, activityId, weatherConfig).pipe(
              Effect.catchTag("WeatherContextError", () => Effect.succeed(null)),
            );
            return yield* getActivityDetail(database, activityId);
          }),
        });
      }),
    );
  }

  static readonly layer = Activities.makeLayer();
}

const isFitFilename = (filename: string) => filename.toLowerCase().endsWith(".fit");
