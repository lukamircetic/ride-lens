import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@ride-lens/db/schema";
import { betterAuth } from "better-auth/minimal";

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

export interface BetterAuthConfig {
  readonly baseURL?: string | undefined;
  readonly secret?: string | undefined;
  readonly trustedOrigins?: ReadonlyArray<string> | undefined;
}

export const makeBetterAuth = (database: AuthDatabase, config: BetterAuthConfig = {}) => {
  const configuredBaseURL = config.baseURL ?? process.env.BETTER_AUTH_URL;
  const baseURL = configuredBaseURL ?? "http://localhost:3002";
  const secret = config.secret ?? process.env.BETTER_AUTH_SECRET;
  const configuredTrustedOrigins =
    config.trustedOrigins ??
    (process.env.RIDE_LENS_WEB_ORIGIN ? [process.env.RIDE_LENS_WEB_ORIGIN] : undefined);
  const trustedOrigins = configuredTrustedOrigins ?? ["http://localhost:3010"];

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  if (process.env.NODE_ENV === "production") {
    if (!configuredBaseURL) {
      throw new Error("BETTER_AUTH_URL is required in production");
    }
    if (!configuredTrustedOrigins?.length) {
      throw new Error("RIDE_LENS_WEB_ORIGIN is required in production");
    }
    assertHttpsOrigin(baseURL, "BETTER_AUTH_URL");
    for (const origin of trustedOrigins) {
      assertHttpsOrigin(origin, "RIDE_LENS_WEB_ORIGIN");
    }
  }

  return betterAuth({
    appName: "Ride Lens",
    baseURL,
    secret,
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [...trustedOrigins],
    advanced: {
      cookiePrefix: "ride-lens",
    },
  });
};

const assertHttpsOrigin = (value: string, name: string) => {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value) {
    throw new Error(`${name} must be an HTTPS origin without a path`);
  }
};

export type RideLensAuth = ReturnType<typeof makeBetterAuth>;
