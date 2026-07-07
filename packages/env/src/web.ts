import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type ViteImportMeta = ImportMeta & {
  readonly env?: Record<string, string | undefined>;
};

const getImportMetaEnv = (key: string): string | undefined =>
  (import.meta as ViteImportMeta).env?.[key];

const getProcessEnv = (key: string): string | undefined =>
  typeof process === "undefined" ? undefined : process.env[key];

const isTruthyEnv = (value: string | undefined): boolean => value === "true" || value === "1";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_MAPTILER_API_KEY: z.string().min(1).optional(),
    VITE_MAPTILER_STYLE_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    VITE_MAPTILER_API_KEY:
      getImportMetaEnv("VITE_MAPTILER_API_KEY") ?? getProcessEnv("VITE_MAPTILER_API_KEY"),
    VITE_MAPTILER_STYLE_ID:
      getImportMetaEnv("VITE_MAPTILER_STYLE_ID") ?? getProcessEnv("VITE_MAPTILER_STYLE_ID"),
  },
  skipValidation: isTruthyEnv(
    getImportMetaEnv("SKIP_ENV_VALIDATION") ?? getProcessEnv("SKIP_ENV_VALIDATION"),
  ),
  emptyStringAsUndefined: true,
});
