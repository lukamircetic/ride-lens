import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@ride-lens/db/schema";
import { Database } from "bun:sqlite";
import { betterAuth } from "better-auth/minimal";
import { drizzle } from "drizzle-orm/bun-sqlite";

const database = drizzle(new Database(":memory:"), { schema });

// This config is loaded only by the Better Auth CLI when generating Drizzle schema.
export const auth = betterAuth({
  appName: "Ride Lens",
  baseURL: "http://localhost:3010",
  secret: "ride-lens-schema-generation-secret",
  database: drizzleAdapter(database, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  advanced: {
    cookiePrefix: "ride-lens",
  },
});
