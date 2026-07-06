import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Context, Effect, Layer } from "effect";
import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

export interface DatabaseConfig {
  readonly dataDir?: string | undefined;
  readonly databaseUrl?: string | undefined;
}

export const getDefaultDataDir = () =>
  resolve(dirname(fileURLToPath(import.meta.url)), "../../..", ".data");

export const getDatabasePath = (dataDir = getDefaultDataDir()) => join(dataDir, "ride-lens.sqlite");

export const getUploadsDir = (dataDir = getDefaultDataDir()) => join(dataDir, "uploads");

export const getMigrationsDir = () =>
  resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");

export const toUploadRelativePath = (absolutePath: string, dataDir = getDefaultDataDir()) =>
  relative(getUploadsDir(dataDir), absolutePath);

export const fromUploadRelativePath = (relativePath: string, dataDir = getDefaultDataDir()) =>
  join(getUploadsDir(dataDir), relativePath);

const makeClientUrl = (config: DatabaseConfig) =>
  config.databaseUrl ?? `file:${getDatabasePath(config.dataDir)}`;

const applyPragmas = (client: Client) =>
  Effect.promise(async () => {
    await client.execute("PRAGMA journal_mode = WAL;");
    await client.execute("PRAGMA synchronous = NORMAL;");
    await client.execute("PRAGMA busy_timeout = 5000;");
    await client.execute("PRAGMA foreign_keys = ON;");
  });

const closeClient = (client: Client) =>
  Effect.promise(() => {
    client.close();
    return Promise.resolve();
  });

export const makeDatabase = (config: DatabaseConfig = {}) =>
  Effect.gen(function* () {
    const dataDir = config.dataDir ?? getDefaultDataDir();
    yield* Effect.promise(() => mkdir(getUploadsDir(dataDir), { recursive: true }));

    const client = createClient({ url: makeClientUrl({ ...config, dataDir }) });
    const db = drizzle(client, { schema });

    yield* applyPragmas(client);
    yield* Effect.promise(() => migrate(db, { migrationsFolder: getMigrationsDir() }));

    return {
      client,
      db,
      dataDir,
      uploadsDir: getUploadsDir(dataDir),
    };
  });

export type RideLensDatabaseService = Effect.Success<ReturnType<typeof makeDatabase>>;
export type RideLensDrizzleDatabase = RideLensDatabaseService["db"];

export class RideLensDatabase extends Context.Service<RideLensDatabase, RideLensDatabaseService>()(
  "@ride-lens/db/RideLensDatabase",
) {}

export const layer = (config: DatabaseConfig = {}) =>
  Layer.effect(
    RideLensDatabase,
    Effect.acquireRelease(makeDatabase(config), (service) =>
      closeClient(service.client).pipe(Effect.orDie),
    ),
  );

export const layerMemory = layer({ databaseUrl: "file::memory:" });
