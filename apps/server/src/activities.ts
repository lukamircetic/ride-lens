import type {
  ActivityDetailResponse,
  ActivityListResponse,
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
  listActivities,
  type ActivityNotFoundError,
  type ActivityQueryError,
} from "./activity-queries";

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
    readonly getDetail: (
      activityId: string,
    ) => Effect.Effect<ActivityDetailResponse, ActivityNotFoundError | ActivityQueryError>;
  }
>()("@ride-lens/server/Activities") {
  static readonly layer = Layer.effect(
    Activities,
    Effect.gen(function* () {
      const database = yield* RideLensDatabase;

      return Activities.of({
        importFit: Effect.fn("Activities.importFit")(function* (options: ImportFitActivityOptions) {
          if (!isFitFilename(options.filename)) {
            return yield* Effect.fail(
              new ActivityInvalidFileTypeError({ filename: options.filename }),
            );
          }

          return yield* importFitActivity(database, options);
        }),
        list: Effect.fn("Activities.list")(function* () {
          return yield* listActivities(database);
        }),
        getDetail: Effect.fn("Activities.getDetail")(function* (activityId: string) {
          return yield* getActivityDetail(database, activityId);
        }),
      });
    }),
  );
}

const isFitFilename = (filename: string) => filename.toLowerCase().endsWith(".fit");
