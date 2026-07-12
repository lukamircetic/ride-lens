import { AuthMiddleware, CurrentUser } from "@ride-lens/api";
import { RideLensDatabase } from "@ride-lens/db";
import { Context, Effect, Layer } from "effect";
import { HttpEffect, HttpRouter, HttpServerRequest } from "effect/unstable/http";
import { HttpApiError } from "effect/unstable/httpapi";
import { makeBetterAuth, type BetterAuthConfig, type RideLensAuth } from "./better-auth";

export type AuthConfig = BetterAuthConfig;

export class AuthService extends Context.Service<
  AuthService,
  {
    readonly auth: RideLensAuth;
  }
>()("@ride-lens/server/AuthService") {}

export const makeAuthServiceLayer = (config: AuthConfig = {}) =>
  Layer.effect(
    AuthService,
    Effect.gen(function* () {
      const database = yield* RideLensDatabase;
      return AuthService.of({ auth: makeBetterAuth(database.db, config) });
    }),
  );

export const AuthRoutes = HttpRouter.add(
  "*",
  "/api/auth/*",
  Effect.gen(function* () {
    const { auth } = yield* AuthService;
    return yield* HttpEffect.fromWebHandler(auth.handler);
  }),
);

const unauthorized = () => new HttpApiError.Unauthorized({});

export const AuthMiddlewareLayer = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const { auth } = yield* AuthService;

    return AuthMiddleware.of((httpEffect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const session = yield* Effect.tryPromise({
          try: () =>
            auth.api.getSession({
              headers: new globalThis.Headers(Object.entries(request.headers)),
            }),
          catch: unauthorized,
        });

        if (!session?.user.id) {
          return yield* Effect.fail(unauthorized());
        }

        return yield* httpEffect.pipe(
          Effect.provideService(
            CurrentUser,
            CurrentUser.of({ id: session.user.id, provider: "better-auth" }),
          ),
        );
      }),
    );
  }),
);
