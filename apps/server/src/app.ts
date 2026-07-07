import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { RideLensApi } from "@ride-lens/api";
import { layer as DatabaseLayer, type DatabaseConfig } from "@ride-lens/db";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError, HttpApiScalar } from "effect/unstable/httpapi";
import { Activities } from "./activities";

export const SystemHandlers = HttpApiBuilder.group(RideLensApi, "system", (handlers) =>
  handlers.handle("health", () => Effect.succeed({ status: "ok" as const })),
);

export const ActivityImportHandlers = HttpApiBuilder.group(
  RideLensApi,
  "activityImports",
  (handlers) =>
    handlers.handle("importFit", ({ payload }) =>
      Effect.gen(function* () {
        const activities = yield* Activities;

        return yield* activities.importFit({
          filePath: payload.file.path,
          filename: payload.file.name,
        });
      }).pipe(
        Effect.catchTags({
          ActivityInvalidFileTypeError: () => Effect.fail(new HttpApiError.BadRequest({})),
          ActivityInvalidFitError: () => Effect.fail(new HttpApiError.BadRequest({})),
          ActivityImportInternalError: () => Effect.fail(new HttpApiError.InternalServerError({})),
        }),
      ),
    ),
);

export const ActivityHandlers = HttpApiBuilder.group(RideLensApi, "activities", (handlers) =>
  handlers
    .handle("listActivities", () =>
      Effect.gen(function* () {
        const activities = yield* Activities;

        return yield* activities.list();
      }).pipe(
        Effect.catchTag("ActivityQueryError", () =>
          Effect.fail(new HttpApiError.InternalServerError({})),
        ),
      ),
    )
    .handle("listActivityRoutes", () =>
      Effect.gen(function* () {
        const activities = yield* Activities;

        return yield* activities.listRoutes();
      }).pipe(
        Effect.catchTag("ActivityQueryError", () =>
          Effect.fail(new HttpApiError.InternalServerError({})),
        ),
      ),
    )
    .handle("getActivity", ({ params }) =>
      Effect.gen(function* () {
        const activities = yield* Activities;

        return yield* activities.getDetail(params.id);
      }).pipe(
        Effect.catchTags({
          ActivityNotFoundError: () => Effect.fail(new HttpApiError.NotFound({})),
          ActivityQueryError: () => Effect.fail(new HttpApiError.InternalServerError({})),
        }),
      ),
    ),
);

export const ApiLive = HttpApiBuilder.layer(RideLensApi, {
  openapiPath: "/openapi.json",
}).pipe(Layer.provide([SystemHandlers, ActivityImportHandlers, ActivityHandlers]));

export const DocsLive = HttpApiScalar.layer(RideLensApi, {
  path: "/docs",
});

export const makeAppLive = (databaseConfig?: DatabaseConfig) =>
  Layer.mergeAll(ApiLive, DocsLive).pipe(
    HttpRouter.provideRequest(Activities.layer.pipe(Layer.provide(DatabaseLayer(databaseConfig)))),
  );

export const AppLive = makeAppLive();

export const makeWebHandler = (databaseConfig?: DatabaseConfig) =>
  HttpRouter.toWebHandler(
    makeAppLive(databaseConfig).pipe(Layer.provide(BunHttpServer.layerHttpServices)),
    {
      disableLogger: true,
    },
  );
