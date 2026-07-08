import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "apps/web/dist/**",
      "apps/web/.tanstack/**",
      "apps/web/src/routeTree.gen.ts",
    ],
    options: {
      typeAware: true,
      typeCheck: false,
    },
    plugins: ["eslint", "import", "oxc", "typescript"],
    jsPlugins: ["./scripts/oxlint-plugin-ride-lens.js"],
    rules: {
      "import/no-duplicates": "warn",
      "import/no-empty-named-blocks": "warn",
      "import/no-self-import": "error",
      "require-yield": "off",
      "ride-lens/no-cross-package-relative-imports": "error",
      "ride-lens/no-inline-schema-compile": "error",
      "ride-lens/no-match-orelse": "error",
      "ride-lens/no-ts-nocheck": "error",
      "typescript/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
        },
      ],
      "typescript/no-base-to-string": "warn",
      "typescript/no-explicit-any": "warn",
      "typescript/no-floating-promises": "warn",
      "typescript/no-import-type-side-effects": "warn",
      "typescript/no-misused-spread": "warn",
    },
    overrides: [
      {
        files: [
          "apps/server/src/**/*.{ts,tsx}",
          "packages/api/src/**/*.{ts,tsx}",
          "packages/db/src/**/*.{ts,tsx}",
        ],
        rules: {
          "ride-lens/no-effect-escape-hatch": "error",
          "ride-lens/no-manual-tag-check": "error",
        },
      },
      {
        files: ["packages/db/src/client.ts"],
        rules: {
          "ride-lens/no-effect-escape-hatch": "off",
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "apps/web/dist/**",
      "apps/web/.tanstack/**",
      "apps/web/src/routeTree.gen.ts",
    ],
    singleQuote: false,
    semi: true,
    sortPackageJson: true,
  },
  staged: {
    "*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}": "vp check --fix",
  },
});
