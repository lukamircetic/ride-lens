# Ride Lens

Self-hosted cycling analytics for the ride files you already own.

Ride Lens turns Garmin FIT activities into an interactive training history: route maps and
replays, speed and elevation profiles, heart-rate zones, matched segments, weather context,
season progress, and recent-ride comparisons. Activity data and original FIT files stay in
your own deployment.

## Highlights

- Import one or many `.fit` files, with SHA-256 duplicate detection.
- Explore route geometry, elevation, speed, heart rate, laps, and animated ride replays.
- Define personal heart-rate zones and review time-in-zone by ride or season.
- Create route segments and compare matched efforts across activities.
- Add historical weather context when a weather provider is configured.
- Keep every account's activities isolated behind session-based authentication.

## Stack

- **Web:** React, TanStack Router, Tailwind CSS, MapLibre GL, Vite+
- **API:** Bun, Effect HTTP API, Better Auth
- **Data:** SQLite/libSQL with Drizzle migrations
- **Monorepo:** pnpm workspaces with shared API, UI, and calculation packages

The production web app is served by Cloudflare Pages. The API and its persistent SQLite
volume run on a Coolify-managed VPS.

## Development

### Prerequisites

- Node.js 24
- pnpm 10.26.1
- Bun 1.3.5

Install dependencies and create local environment files:

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Generate a local auth secret and add it to `apps/server/.env`:

```bash
openssl rand -base64 32
```

Run the API and web app in separate terminals:

```bash
pnpm dev:server
pnpm dev:web
```

Open [http://localhost:3010](http://localhost:3010). The browser sends authenticated API
requests to `http://localhost:3002`.

Local app data is written to `.data/`:

- `.data/ride-lens.sqlite`
- `.data/uploads/fit/*.fit`

The directory is gitignored. After creating an account, use
[`sample/ride-0-2026-07-05-12-30-42.fit`](sample/ride-0-2026-07-05-12-30-42.fit) to try an
import.

## Scripts

- `pnpm dev:web` — start the web app
- `pnpm dev:server` — start the API
- `pnpm check` — check formatting, lint rules, builds, and TypeScript
- `pnpm test` — run package and API tests
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:studio` — open Drizzle Studio

## API

- `GET /health`
- `POST /api/activities/import`
- `GET /api/activities`
- `GET /api/activities/:id`
- `GET /api/heart-rate-zones/profile`
- `PUT /api/heart-rate-zones/profile`
- `GET /api/heart-rate-zones/season/:year`
- `GET /openapi.json`
- `GET /docs`
