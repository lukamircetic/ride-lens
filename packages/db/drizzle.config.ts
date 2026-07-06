import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.RIDE_LENS_DATABASE_URL ?? "file:../../.data/ride-lens.sqlite",
  },
});
