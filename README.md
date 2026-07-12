# Ride Lens

Private cycling analytics dashboard for manually imported FIT activity files.

V1 is intentionally local-first:

- Upload one or more `.fit` files from the web app.
- Parse rides with Garmin's FIT SDK.
- Persist the original FIT file plus normalized ride summaries, records, and laps in SQLite.
- View ride list, selected ride stats, route shape, speed/elevation/heart-rate profiles, yearly progress, and season highlights.

See [docs/feature-roadmap.md](docs/feature-roadmap.md) for the map, segment, replay, weather, and 3D terrain roadmap.
See [docs/deployment.md](docs/deployment.md) for the Cloudflare Pages and Coolify production runbook.

## Stack

- `apps/web`: React, TanStack Router, Tailwind CSS, Vite+
- `apps/server`: Bun, Effect `HttpApi`, `@effect/platform-bun`
- `packages/api`: shared Effect API contract and response schemas
- `packages/db`: SQLite/libSQL, Drizzle schema and migrations
- `packages/ui`: shared shadcn/ui primitives

## Development

Install dependencies:

```bash
pnpm install
```

Run both apps:

```bash
pnpm dev:server
pnpm dev:web
```

Open the web app at [http://localhost:3010](http://localhost:3010). Authentication and API requests are sent directly to `http://localhost:3002` with credentialed CORS. The Vite proxy remains available for manual development requests.

Local app data is written to `.data/`:

- `.data/ride-lens.sqlite`
- `.data/uploads/fit/*.fit`

`.data/` is gitignored.

## Sample Ride

A sample FIT file is available at:

```bash
sample/ride-0-2026-07-05-12-30-42.fit
```

Create an account in the web app, then upload the sample through the authenticated dashboard.

Duplicate uploads are detected by SHA-256 hash and return the existing activity instead of inserting another copy.

## Scripts

- `pnpm dev:web`: start the web app
- `pnpm dev:server`: start the Effect backend
- `pnpm check`: run formatting, lint, build, and TypeScript checks
- `pnpm test`: run server tests
- `pnpm db:generate`: generate Drizzle migrations
- `pnpm db:studio`: open Drizzle Studio

## API

- `GET /health`
- `POST /api/activities/import`
- `GET /api/activities`
- `GET /api/activities/:id`
- `GET /openapi.json`
- `GET /docs`
