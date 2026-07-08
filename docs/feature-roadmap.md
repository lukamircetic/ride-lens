# Ride Lens Feature Roadmap

Ride Lens is a private cycling analytics app for manually imported FIT files. V1 should stay local-first, fast to iterate on, and focused on answering one question well: how are rides changing over the year, and what explains those changes?

## Current Baseline

Already implemented:

- FIT upload from the web app, including multi-file upload.
- Original FIT files stored on disk.
- Normalized activity, record, and lap data stored in SQLite through Drizzle.
- Duplicate upload detection by file hash.
- Ride log with selected ride deep links.
- Selected ride detail with distance, speed, heart rate, climbing, profiles, laps, and GPS availability.
- Season snapshot, recent-vs-previous comparison, and year progress.
- MapLibre selected-ride map with metric-colored route overlays.
- All-rides map with route highlighting and click-to-select behavior.
- Weather ingestion, weather observation caching, and ride-level wind context summaries.
- Manual segment schema, selected-ride map create/edit mode, segment stat computation, and same-direction effort matching.
- Dedicated Segments tab for comparing saved efforts across rides.

Current roadmap position:

- The map foundation is in place.
- Weather is usable earlier than originally planned, but should still be treated as ride-level context until segment-level matching exists.
- Manual segment creation/editing and basic cross-ride effort comparison are in place; the next major product push should be richer segment inspection, charts, and weather context.
- Strava/community segment import should be researched and isolated behind a provider boundary before any implementation. The local Ride Lens segment model should not depend on Strava data or Strava retention rights.

## Map Platform Decision

Use MapLibre GL JS as the map renderer.

MapLibre does not require an API key by itself. The key belongs to the map tile provider. For V1, use MapTiler Cloud because it gives us a quick MapLibre-compatible basemap, terrain, satellite, and outdoor styles without running tile infrastructure.

Frontend environment variable:

```bash
VITE_MAPTILER_API_KEY=
VITE_MAPTILER_STYLE_ID=streets-v2
```

Recommended first styles:

- Streets/vector style for the default ride map, darkened in-app with a restrained
  Apple Maps-like palette.
- Satellite/hybrid as an optional inspection layer later.
- Terrain DEM source for 3D terrain/replay experiments.

Do not depend directly on the public OpenStreetMap tile servers for production. OpenStreetMap is the data source/ecosystem; MapLibre is the renderer. We should use a tile provider or self-hosted PMTiles rather than leaning on the public OSM tile service.

Future self-hosting path:

- Use Protomaps PMTiles for OSM-derived vector basemaps.
- Serve local or static-hosted `.pmtiles` archives.
- Keep MapLibre as the renderer so the UI and feature code can stay mostly unchanged.

## MapTiler Setup

User setup needed:

1. Create or sign into a MapTiler Cloud account.
2. Create a key for Ride Lens.
3. For local development, use a separate dev key. If MapTiler rejects localhost origin
   restrictions, leave that dev key unrestricted and keep it out of Git.
4. Add the eventual production/private app origin to a restricted production key once known.
5. Put the key in the web app environment as `VITE_MAPTILER_API_KEY`.

Local `.env` shape:

```bash
VITE_MAPTILER_API_KEY=your_key_here
VITE_MAPTILER_STYLE_ID=streets-v2
```

The key is a public browser key, not a server secret. It should still be restricted by origin once we know the deploy URL.

## Weather Platform Decision

Use Open-Meteo Historical Weather API for V1 wind and weather context.

Open-Meteo gives us hourly historical temperature, precipitation, wind speed,
wind direction, and gust data by coordinate. For this private/local app, no API
key is needed; the server calls the public archive endpoint directly and caches
the result in SQLite. If Ride Lens later becomes a hosted/commercial product,
move to a paid Open-Meteo plan or another weather provider behind the same
server-side weather client boundary.

Initial request shape:

```bash
https://archive-api.open-meteo.com/v1/archive?latitude=...&longitude=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&hourly=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms&timezone=UTC
```

## Feature Tracks

### 1. Interactive Ride Map

Goal: replace the current SVG route preview with a real map.

Scope:

- Render selected ride route on MapLibre.
- Fit bounds to the selected route.
- Color the route by one metric: speed, heart rate, or elevation.
- Show start/end markers.
- Keep the current stat panels around the map.
- Add a graceful empty state for rides without GPS records.

Why first:

- It immediately improves the selected ride view.
- It creates the map component needed by segments and replay.
- It validates MapLibre, tile provider setup, and route data shape.

### 2. All-Rides Map

Goal: see the year of riding spatially.

Scope:

- Render all ride routes as lightweight lines.
- Highlight selected ride.
- Click a route to select/open that ride.
- Filter by year/month, distance, average speed, elevation gain, and heart-rate availability.
- Add route density or opacity scaling once many rides exist.

Useful questions:

- Where did I ride most this year?
- Which rides used the same roads?
- Which routes should be compared as similar efforts?

### 3. Manual Segment Selection

Goal: select a portion of a ride, especially climbs, and compute stats for that range.

Scope:

- Click two points on a selected ride route.
- Snap points to the route.
- Slice records between those points.
- Compute distance, elapsed time, moving time, average speed, max speed, average HR, max HR, elevation gain, VAM, and optional cadence/power fields.
- Save named manual segments locally.

Initial implementation can be per-ride only. Cross-ride matching comes next.

Recommended implementation shape:

- Start with local/manual segments as the canonical model.
- Store segment endpoints as snapped record indexes and distances, not just coordinates. Coordinates are useful for display, but record indexes make exact slicing and stat recomputation reproducible.
- Store a simplified geometry snapshot for display and future matching, but keep raw FIT records as the source of truth.
- Compute segment stats from the selected activity records on save, then make those stats cacheable/rebuildable.
- Keep the first UI direct-manipulation based: enter segment mode, choose two snapped points on the route, preview the selected range, inspect computed stats, then save with a name.
- Make an unsaved draft segment a first-class UI state so editing the endpoints feels reversible.

Manual segment V1 data needs:

- Segment definition: id, source activity id, name, start/end record indexes, start/end distances, start/end timestamps, geometry, created time, updated time.
- Segment stats: distance, elapsed time, moving time, average speed, max speed, average HR, max HR, elevation gain, elevation loss, VAM, average cadence, average power, normalized power when available.
- Segment source metadata: `manual`, and later optional provider fields such as `strava_segment_id` for transient/imported references if policy allows.

UI principles:

- Segment selection should happen on the map, not in a form.
- Creation and editing should live in the selected ride map, exposed as a compact `Create segment` control near the speed, heart-rate, and elevation metric controls.
- Entering create/edit mode should visibly change the map state, for example with a stronger border treatment and endpoint handles, so it is clear clicks are selecting segment bounds.
- The selected segment should be visible simultaneously on the map and the profile charts.
- Endpoint adjustment currently supports clicking two points, clicking again to replace the nearest endpoint, or choosing "clear" without losing the ride view. Drag handles are a later refinement.
- The stats preview should be compact and comparable to ride stat panels.
- Saving should require a segment name and should show computed stats before commit.
- The selected ride detail should support toggling saved segments on the map and clicking a segment to inspect its segment-specific stats, including wind, heart rate, speed, elevation, and weather context where available.
- The saved segment list should live near the selected ride detail first, then graduate into a dedicated segments view when cross-ride matching exists.
- Segment management and comparison should live in a separate Segments tab/page after V1, rather than crowding the default ride dashboard.

Open design questions:

- Whether segment names should default from location/climb cues or just "Segment 1".
- Whether the initial saved segment should be tied only to one source ride, or immediately attempt matching against all existing rides after save.
- Whether to support overlapping segments in V1. The backend should allow them; the UI can keep them simple.

### 4. Segment Comparison

Goal: compare the same effort across multiple rides.

Scope:

- Match saved segment geometry against other rides.
- Compare elapsed time, average speed, HR, climb rate, and elevation gain.
- Provide a dedicated Segments tab/page with a saved segment list, selected segment summary, ranked effort table, and links back to source rides.
- Show trend charts over the season.
- Mark best effort, latest effort, and similar-weather efforts once weather exists.

Useful derived metrics without power:

- Average speed.
- Average heart rate.
- Heart-rate cost per speed.
- VAM for climbs.
- Pace change over the same distance.
- HR drift within longer efforts.

Recommended implementation shape:

- After manual segment save, run a background/local matching pass against other rides with GPS.
- Treat matching as derived data in `segment_efforts`, not as a mutation of the original segment definition.
- Start with conservative matching: same direction, similar start/end proximity, sufficient geometry overlap, and distance tolerance.
- Record match confidence and the matched activity record range so the UI can explain or reject fuzzy matches later.
- Do not try to produce Strava-like leaderboards in V1. Focus on "my efforts over time" and "what explains the difference".

### 5. Weather And Wind Context

Goal: explain why similar rides or segments felt faster/slower.

Scope:

- Fetch historical weather after ride import or as a backfill job.
- Store hourly weather snapshots near the ride route/time.
- Show temperature, wind speed, wind direction, gusts, and precipitation.
- Calculate headwind/tailwind component along route bearing.
- Summarize a ride or segment with a "wind burden" score.

Avoid promising true "normalized speed" in V1. Without power, rider position, CdA, mass, and rolling resistance, we can estimate context but not produce a physics-grade normalized speed.

Status:

- Ride-level weather and wind context is implemented.
- Segment-level weather summaries should wait until segment efforts exist, then reuse the existing weather observations and wind component calculations over the matched record range.

### Strava Segment Import Research

Goal: determine whether Strava can be used for community segment discovery without making Ride Lens dependent on Strava data.

Current read:

- Strava public API exposes segment exploration, but Strava segment and leaderboard data is Strava Data.
- Strava API terms and policy restrict display, disclosure, aggregation, geographic caching, and long-term retention. They also describe a seven-day cache limit for Strava Data.
- Because Ride Lens is local-first and analytics-oriented, storing imported community segments indefinitely is likely not compatible without explicit permission or a licensed integration.
- Strava Live Segments is a partner/licensed path, not a normal V1 dependency.

Recommended path:

- Do not import Strava community segments into the canonical local segment tables in V1.
- If explored later, keep a `strava_segments_cache` table or provider cache that expires aggressively and can be deleted independently.
- Let users create local manual segments from their own FIT data. Those local segments are Ride Lens data, not Strava Data.
- Consider a "discover nearby Strava segments" experiment only after confirming current terms and access level, and only if the UI clearly treats results as temporary provider data.
- If a user manually recreates a local segment based on their own ride, store only the local segment geometry and stats derived from their FIT file.

### 6. Ride Replay

Goal: replay a ride as an animated route with synchronized metrics.

Scope:

- 2D replay first: animated dot, trailing line, speed/HR/elevation readouts.
- Playback controls: play/pause, scrubber, speed multiplier.
- Camera options: static fit-bounds, follow rider, rotate by bearing.
- Reuse record timestamps and distances from the existing detail payload.

Recommended implementation:

- Start with MapLibre line + marker animation.
- Move to deck.gl `TripsLayer` if we want smoother trails, fading paths, or multiple animated rides.

### 7. 3D Terrain Replay

Goal: make climbs and route shape feel physically legible.

Scope:

- Enable pitched MapLibre terrain with DEM tiles.
- Render route above terrain.
- Animate camera bearing/pitch along the route.
- Show elevation profile synchronized with playback.
- Add a cinematic mode only after the useful analytic version works.

Recommended path:

1. MapLibre 2D replay.
2. MapLibre terrain with pitched camera.
3. deck.gl overlays for smoother animation.
4. Three.js custom layer only if MapLibre/deck.gl are too limiting.

## Implementation Order

Completed or materially started:

1. Add MapLibre dependencies and `VITE_MAPTILER_API_KEY` env validation.
2. Build selected-ride MapLibre route map.
3. Replace the SVG route preview with the selected-ride map.
4. Add all-rides map mode.
5. Add weather ingestion, caching, and ride-level wind summaries.
6. Add manual segment schema and migrations.
7. Add backend segment stat computation for selected activity record ranges.
8. Add selected-ride map create/edit mode and saved segment overlays.
9. Save named manual segments in SQLite.
10. Match saved segments against other rides and persist `segment_efforts`.
11. Build a dedicated Segments tab/page for saved segment management and effort comparison.

Recommended next implementation order:

1. Add profile-chart highlighting for the selected segment range.
2. Add segment comparison charts and weather-context filters.
3. Add segment-level weather/wind summaries over matched effort ranges.
4. Add all-rides map filters.
5. Add 2D ride replay.
6. Prototype 3D terrain replay.

## Data Model Notes

Current and likely future tables:

- `segments`: saved manual segment definitions, names, and geometry/range metadata.
- `segment_efforts`: per-activity matched segment stats.
- `weather_observations`: hourly or sampled weather data used by rides/segments.
- `activity_weather_summaries`: cached ride-level weather and wind summaries.
- `segment_weather_summaries`: optional cached segment-level weather/wind summaries once segment efforts exist.
- `external_segment_cache`: optional short-lived provider cache for Strava or other segment discovery data if policy allows.

Keep raw FIT records as the source of truth. Derived stats should be cacheable and reproducible.

## Design Direction

The current frontend is using a dark tarmac/road-sign visual language. Map work should feel integrated with that rather than default SaaS map styling:

- Use restrained dark map styles where possible.
- Keep metric controls compact and tool-like.
- Use route color intentionally for selected metric overlays.
- Do not hide map attribution.
- Prefer direct manipulation for segment selection over form-heavy workflows.

## References

- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
- MapLibre 3D terrain example: https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/
- deck.gl with MapLibre: https://deck.gl/docs/developer-guide/base-maps/using-with-maplibre
- deck.gl TripsLayer: https://deck.gl/docs/api-reference/geo-layers/trips-layer
- Protomaps PMTiles with MapLibre: https://docs.protomaps.com/pmtiles/maplibre
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/
