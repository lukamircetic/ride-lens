import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { RideLensApi } from "@ride-lens/api";
import { layer as DatabaseLayer, type DatabaseConfig } from "@ride-lens/db";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError, HttpApiScalar } from "effect/unstable/httpapi";
import { Activities } from "./activities";
import { Segments } from "./segments";
import type { WeatherConfig } from "./weather";

export interface AppConfig extends DatabaseConfig {
  readonly weather?: WeatherConfig | undefined;
}

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

export const SegmentHandlers = HttpApiBuilder.group(RideLensApi, "segments", (handlers) =>
  handlers
    .handle("listSegments", () =>
      Effect.gen(function* () {
        const segments = yield* Segments;

        return yield* segments.list();
      }).pipe(
        Effect.catchTag("SegmentQueryError", () =>
          Effect.fail(new HttpApiError.InternalServerError({})),
        ),
      ),
    )
    .handle("createSegment", ({ payload }) =>
      Effect.gen(function* () {
        const segments = yield* Segments;

        return yield* segments.create(payload);
      }).pipe(
        Effect.catchTags({
          SegmentValidationError: () => Effect.fail(new HttpApiError.BadRequest({})),
          SegmentQueryError: () => Effect.fail(new HttpApiError.InternalServerError({})),
        }),
      ),
    )
    .handle("updateSegment", ({ params, payload }) =>
      Effect.gen(function* () {
        const segments = yield* Segments;

        return yield* segments.update(params.id, payload);
      }).pipe(
        Effect.catchTags({
          SegmentValidationError: () => Effect.fail(new HttpApiError.BadRequest({})),
          SegmentNotFoundError: () => Effect.fail(new HttpApiError.NotFound({})),
          SegmentQueryError: () => Effect.fail(new HttpApiError.InternalServerError({})),
        }),
      ),
    )
    .handle("listActivitySegments", ({ params }) =>
      Effect.gen(function* () {
        const segments = yield* Segments;

        return yield* segments.listForActivity(params.id);
      }).pipe(
        Effect.catchTag("SegmentQueryError", () =>
          Effect.fail(new HttpApiError.InternalServerError({})),
        ),
      ),
    ),
);

export const ApiLive = HttpApiBuilder.layer(RideLensApi, {
  openapiPath: "/openapi.json",
}).pipe(Layer.provide([SystemHandlers, ActivityImportHandlers, ActivityHandlers, SegmentHandlers]));

export const DocsLive = HttpApiScalar.layer(RideLensApi, {
  path: "/docs",
});

export const makeAppLive = (config?: AppConfig) =>
  Layer.mergeAll(ApiLive, DocsLive).pipe(
    HttpRouter.provideRequest(
      Layer.mergeAll(Activities.makeLayer(config?.weather), Segments.layer).pipe(
        Layer.provide(
          DatabaseLayer({ dataDir: config?.dataDir, databaseUrl: config?.databaseUrl }),
        ),
      ),
    ),
  );

export const AppLive = makeAppLive();

export const makeWebHandler = (config?: AppConfig) =>
  HttpRouter.toWebHandler(
    makeAppLive(config).pipe(Layer.provide(BunHttpServer.layerHttpServices)),
    {
      disableLogger: true,
    },
  );
