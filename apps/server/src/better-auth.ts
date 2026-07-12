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
  const baseURL = config.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3010";
  const secret = config.secret ?? process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not configured");
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
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: config.trustedOrigins ? [...config.trustedOrigins] : undefined,
    advanced: {
      cookiePrefix: "ride-lens",
    },
  });
};

export type RideLensAuth = ReturnType<typeof makeBetterAuth>;
