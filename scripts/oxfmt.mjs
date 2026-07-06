import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const vitePlusPackagePath = require.resolve("vite-plus/package.json");
const vitePlusPackage = JSON.parse(readFileSync(vitePlusPackagePath, "utf8"));
const oxfmtEntryPath = require.resolve("oxfmt", {
  paths: [dirname(vitePlusPackagePath)],
});
const oxfmtBinPath = join(dirname(dirname(oxfmtEntryPath)), "bin", "oxfmt");

const result = spawnSync(
  process.execPath,
  [oxfmtBinPath, "--config", "vite.config.ts", ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      VP_VERSION: vitePlusPackage.version,
      VP_RESOLVING_CONFIG_METADATA: "1",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
