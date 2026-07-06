/**
 * Deterministic mock ride dataset + pure domain helpers.
 *
 * Shared across all five design systems so each design renders from the
 * same underlying reality. Numbers are generated to be internally
 * consistent (distance/speed/time/grade/elevation/HR/power all derive
 * from one simulated ride path), which keeps every chart honest.
 */

import type { ActivityDetailResponse, ActivityListResponse } from "@ride-lens/api";

export type Ride = ActivityListResponse["activities"][number];
export type Record = ActivityDetailResponse["records"][number];
type Summary = Ride["summary"];
type Lap = ActivityDetailResponse["laps"][number];

export interface SeasonSpec {
  readonly year: number;
  readonly title: string;
  readonly athlete: string;
}

export const SEASON: SeasonSpec = {
  year: 2026,
  title: "Spring – Summer Block",
  athlete: "L. Mircetić",
};

interface RideSpec {
  readonly seed: number;
  readonly day: string;
  readonly name: string;
  readonly targetKm: number;
  readonly targetAvgKmh: number;
  readonly climbiness: number;
  readonly type: "road" | "climb" | "flat" | "interval" | "recovery";
}

const BASE_LAT = 45.082;
const BASE_LON = 7.613;

const RIDE_SPECS: ReadonlyArray<RideSpec> = [
  {
    seed: 101,
    day: "2026-03-14T09:12:00",
    name: "Season opener · Parco",
    targetKm: 28.4,
    targetAvgKmh: 26.5,
    climbiness: 0.2,
    type: "recovery",
  },
  {
    seed: 122,
    day: "2026-03-21T08:40:00",
    name: "Colle della Maddalena loop",
    targetKm: 52.1,
    targetAvgKmh: 27.1,
    climbiness: 0.7,
    type: "climb",
  },
  {
    seed: 207,
    day: "2026-03-29T10:05:00",
    name: "River flat · tempo",
    targetKm: 41.8,
    targetAvgKmh: 31.2,
    climbiness: 0.1,
    type: "flat",
  },
  {
    seed: 333,
    day: "2026-04-05T09:30:00",
    name: "Superga repeats",
    targetKm: 36.9,
    targetAvgKmh: 24.8,
    climbiness: 1.0,
    type: "interval",
  },
  {
    seed: 411,
    day: "2026-04-12T08:15:00",
    name: "Long Sunday · Pinerolo",
    targetKm: 78.3,
    targetAvgKmh: 28.4,
    climbiness: 0.5,
    type: "road",
  },
  {
    seed: 528,
    day: "2026-04-19T09:00:00",
    name: "Canavese wandering",
    targetKm: 64.2,
    targetAvgKmh: 27.9,
    climbiness: 0.4,
    type: "road",
  },
  {
    seed: 614,
    day: "2026-04-26T08:50:00",
    name: "Sestriere approach",
    targetKm: 92.7,
    targetAvgKmh: 26.2,
    climbiness: 0.9,
    type: "climb",
  },
  {
    seed: 707,
    day: "2026-05-03T09:45:00",
    name: "Recovery spin",
    targetKm: 24.6,
    targetAvgKmh: 25.1,
    climbiness: 0.15,
    type: "recovery",
  },
  {
    seed: 808,
    day: "2026-05-10T08:30:00",
    name: "Hill repeats · Revigliasco",
    targetKm: 39.5,
    targetAvgKmh: 25.5,
    climbiness: 0.8,
    type: "interval",
  },
  {
    seed: 909,
    day: "2026-05-17T07:55:00",
    name: "Gran fondo recon",
    targetKm: 108.4,
    targetAvgKmh: 28.9,
    climbiness: 0.7,
    type: "road",
  },
  {
    seed: 1010,
    day: "2026-05-24T09:10:00",
    name: "Po river flat",
    targetKm: 47.2,
    targetAvgKmh: 32.4,
    climbiness: 0.05,
    type: "flat",
  },
  {
    seed: 1111,
    day: "2026-05-31T08:20:00",
    name: "Alps preview · Susa",
    targetKm: 85.6,
    targetAvgKmh: 25.9,
    climbiness: 0.95,
    type: "climb",
  },
  {
    seed: 1212,
    day: "2026-06-07T09:30:00",
    name: "Group ride · Monferrato",
    targetKm: 68.7,
    targetAvgKmh: 30.1,
    climbiness: 0.45,
    type: "road",
  },
  {
    seed: 1313,
    day: "2026-06-14T08:05:00",
    name: "Threshold test",
    targetKm: 33.8,
    targetAvgKmh: 33.6,
    climbiness: 0.1,
    type: "interval",
  },
  {
    seed: 1414,
    day: "2026-06-21T07:40:00",
    name: "Century attempt",
    targetKm: 142.6,
    targetAvgKmh: 27.7,
    climbiness: 0.6,
    type: "road",
  },
  {
    seed: 1515,
    day: "2026-06-28T09:00:00",
    name: "Easy day · Valentino",
    targetKm: 22.1,
    targetAvgKmh: 24.8,
    climbiness: 0.1,
    type: "recovery",
  },
  {
    seed: 1616,
    day: "2026-07-03T08:25:00",
    name: "Monviso silhouette",
    targetKm: 96.3,
    targetAvgKmh: 26.6,
    climbiness: 0.85,
    type: "climb",
  },
  {
    seed: 1717,
    day: "2026-07-05T18:10:00",
    name: "Evening criterium",
    targetKm: 38.4,
    targetAvgKmh: 34.9,
    climbiness: 0.2,
    type: "flat",
  },
];

interface GeneratedRide {
  readonly records: ReadonlyArray<Record>;
  readonly summary: Summary;
  readonly distanceMeters: number;
  readonly ascentMeters: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function generateRide(spec: RideSpec): GeneratedRide {
  const rand = mulberry32(spec.seed);
  const N = 460;

  const cx = BASE_LON + (rand() - 0.5) * 0.06;
  const cy = BASE_LAT + (rand() - 0.5) * 0.045;
  const spanDeg = spec.targetKm / 2 / 111;
  const baseRadius = spanDeg * (0.55 + rand() * 0.3);

  const k1 = 2 + Math.floor(rand() * 3);
  const k2 = 3 + Math.floor(rand() * 4);
  const a1 = 0.8 + rand() * 0.5;
  const a2 = 0.25 + rand() * 0.35;
  const a3 = 0.1 + rand() * 0.2;
  const ph0 = rand() * Math.PI * 2;
  const ph1 = rand() * Math.PI * 2;
  const rot = rand() * Math.PI * 2;
  const drift = (rand() - 0.5) * 0.6;

  const peakCount = 1 + Math.round(spec.climbiness * 4);
  const peaks: Array<{ c: number; w: number; h: number }> = [];
  for (let i = 0; i < peakCount; i++) {
    peaks.push({
      c: 0.1 + rand() * 0.8,
      w: 0.04 + rand() * 0.07,
      h: (120 + rand() * 320) * (0.5 + spec.climbiness),
    });
  }
  const baseElev = 240 + rand() * 60;

  const pts: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * Math.PI * 2;
    const r = baseRadius * (a1 + a2 * Math.sin(k1 * t + ph0) + a3 * Math.sin(k2 * t + ph1));
    const ang = t + rot + drift * (i / N);
    pts.push({ lon: cx + r * Math.cos(ang), lat: cy + r * Math.sin(ang) * 0.74 });
  }

  const records: Record[] = [];
  let dist = 0;
  let time = 0;
  let ascent = 0;
  let prevElev = baseElev;

  const avgTarget = spec.targetAvgKmh / 3.6;

  for (let i = 0; i < N; i++) {
    const p = i / (N - 1);
    let elev = baseElev;
    for (const peak of peaks) {
      elev += peak.h * Math.exp(-((p - peak.c) ** 2) / (2 * peak.w * peak.w));
    }
    if (i > 0) {
      const dElev = elev - prevElev;
      if (dElev > 0) ascent += dElev;
    }

    const next = pts[(i + 1) % N]!;
    const step = i === N - 1 ? 0 : haversineMeters(pts[i]!.lat, pts[i]!.lon, next.lat, next.lon);
    const grade = step > 0 ? ((elev - prevElev) / step) * 100 : 0;

    const gradePenalty = Math.max(0, grade) * 1.9;
    const downhillBoost = Math.max(0, -grade) * 2.4;
    const noise = (rand() - 0.5) * 1.8;
    let speed = avgTarget * (1.04 - gradePenalty / 9 + downhillBoost / 11) + noise;
    speed = Math.max(4.2, Math.min(22, speed));

    const dt = step > 0 ? step / speed : 0.9;
    dist += step;
    time += dt;

    const effort = Math.max(0, grade * 11) + avgTarget * 0.5;
    const power = Math.round(Math.max(90, Math.min(560, 150 + effort * 1.4 + (rand() - 0.4) * 28)));
    const hr = Math.round(Math.max(108, Math.min(192, 96 + power * 0.52 + (rand() - 0.5) * 6)));
    const cadence = Math.round(
      Math.max(0, Math.min(102, 86 - Math.max(0, grade) * 12 + (rand() - 0.5) * 5)),
    );
    const temp = Math.round(14 + rand() * 14);

    records.push({
      recordIndex: i,
      timestamp: new Date(Date.parse(spec.day) + Math.round(time * 1000)).toISOString(),
      latitude: pts[i]!.lat,
      longitude: pts[i]!.lon,
      altitudeMeters: elev,
      distanceMeters: dist,
      speedMetersPerSecond: speed,
      heartRateBpm: hr,
      cadenceRpm: cadence,
      powerWatts: power,
      temperatureCelsius: temp,
      gradePercent: grade,
      gpsAccuracyMeters: 3,
    });

    prevElev = elev;
  }

  const movingSeconds = time;
  const elapsedSeconds = movingSeconds * 1.045;
  const avgSpeed = dist / movingSeconds;
  const speeds = records.map((r) => r.speedMetersPerSecond ?? 0);
  const hrs = records.map((r) => r.heartRateBpm ?? 0);
  const powers = records.map((r) => r.powerWatts ?? 0);
  const cadences = records.map((r) => r.cadenceRpm ?? 0);
  const maxSpeed = Math.max(...speeds);
  const maxHr = Math.max(...hrs);
  const maxPower = Math.max(...powers);
  const avgHr = weightedBy(
    hrs,
    records.map((_, i) => (i === 0 ? 0 : 1)),
  );
  const avgPower = weightedBy(
    powers,
    records.map((_, i) => (i === 0 ? 0 : 1)),
  );
  const np = Math.round(Math.sqrt(powers.reduce((s, p) => s + p * p * p, 0) / powers.length));
  const avgCadence = weightedBy(
    cadences,
    records.map((_, i) => (i === 0 ? 0 : 1)),
  );
  const calories = Math.round((avgPower * movingSeconds) / 4184);

  let descent = 0;
  for (let i = 1; i < records.length; i++) {
    const d = (records[i]!.altitudeMeters ?? 0) - (records[i - 1]!.altitudeMeters ?? 0);
    if (d < 0) descent += -d;
  }

  const first = records[0]!;

  const summary: Summary = {
    startTime: spec.day,
    endTime: new Date(Date.parse(spec.day) + Math.round(elapsedSeconds * 1000)).toISOString(),
    sport: "cycling",
    subSport:
      spec.type === "interval" ? "training" : spec.type === "recovery" ? "recreation" : "road",
    totalDistanceMeters: dist,
    totalElapsedSeconds: elapsedSeconds,
    totalTimerSeconds: movingSeconds,
    totalMovingSeconds: movingSeconds,
    totalAscentMeters: ascent,
    totalDescentMeters: descent,
    calories,
    avgSpeedMetersPerSecond: avgSpeed,
    maxSpeedMetersPerSecond: maxSpeed,
    avgHeartRateBpm: avgHr,
    maxHeartRateBpm: maxHr,
    avgPowerWatts: avgPower,
    maxPowerWatts: maxPower,
    normalizedPowerWatts: np,
    avgCadenceRpm: avgCadence,
    startLatitude: first.latitude,
    startLongitude: first.longitude,
    recordCount: N,
    lapCount: Math.max(1, Math.round(dist / 18000)),
    sessionCount: 1,
    hasGps: true,
  };

  return {
    records,
    summary,
    distanceMeters: dist,
    ascentMeters: ascent,
  };
}

function weightedBy(values: ReadonlyArray<number>, weights: ReadonlyArray<number>): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    num += values[i]! * weights[i]!;
    den += weights[i]!;
  }
  return den > 0 ? num / den : 0;
}

const generated: ReadonlyArray<{ spec: RideSpec; ride: GeneratedRide }> = RIDE_SPECS.map(
  (spec) => ({
    spec,
    ride: generateRide(spec),
  }),
);

export const rides: ReadonlyArray<Ride> = generated.map(({ spec, ride }, i) => ({
  id: `ride-${String(i + 1).padStart(3, "0")}`,
  filename: `ride-${i}-${spec.day.slice(0, 10)}-${spec.seed}.fit`,
  source: "fit" as const,
  importedAt: spec.day,
  summary: ride.summary,
}));

export function rideById(id: string): Ride | undefined {
  return rides.find((r) => r.id === id);
}

const detailCache = new Map<string, ActivityDetailResponse>();

export function rideDetail(id: string): ActivityDetailResponse | undefined {
  const cached = detailCache.get(id);
  if (cached) return cached;
  const index = rides.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  const { records, summary } = generated[index]!.ride;
  const laps = buildLaps(records, summary.lapCount);
  const detail: ActivityDetailResponse = {
    activity: rides[index]!,
    records,
    laps,
  };
  detailCache.set(id, detail);
  return detail;
}

function buildLaps(records: ReadonlyArray<Record>, lapCount: number): Lap[] {
  const n = records.length;
  const per = Math.ceil(n / lapCount);
  const laps: Lap[] = [];
  for (let l = 0; l < lapCount; l++) {
    const slice = records.slice(l * per, (l + 1) * per);
    if (slice.length === 0) continue;
    const first = slice[0]!;
    const last = slice[slice.length - 1]!;
    const dist = (last.distanceMeters ?? 0) - (first.distanceMeters ?? 0);
    const time = (Date.parse(last.timestamp ?? "") - Date.parse(first.timestamp ?? "")) / 1000 || 0;
    const speeds = slice.map((r) => r.speedMetersPerSecond ?? 0);
    const hrs = slice.map((r) => r.heartRateBpm).filter((v): v is number => v != null);
    const powers = slice.map((r) => r.powerWatts).filter((v): v is number => v != null);
    let asc = 0;
    let desc = 0;
    for (let i = 1; i < slice.length; i++) {
      const d = (slice[i]!.altitudeMeters ?? 0) - (slice[i - 1]!.altitudeMeters ?? 0);
      if (d > 0) asc += d;
      else desc += -d;
    }
    laps.push({
      lapIndex: l,
      startTime: first.timestamp,
      endTime: last.timestamp,
      totalDistanceMeters: dist,
      totalElapsedSeconds: time,
      totalTimerSeconds: time,
      avgSpeedMetersPerSecond: dist / Math.max(time, 1),
      maxSpeedMetersPerSecond: Math.max(...speeds),
      avgHeartRateBpm: hrs.length ? Math.round(hrs.reduce((s, v) => s + v, 0) / hrs.length) : null,
      maxHeartRateBpm: hrs.length ? Math.max(...hrs) : null,
      avgPowerWatts: powers.length
        ? Math.round(powers.reduce((s, v) => s + v, 0) / powers.length)
        : null,
      maxPowerWatts: powers.length ? Math.max(...powers) : null,
      avgCadenceRpm: null,
      totalAscentMeters: asc,
      totalDescentMeters: desc,
      startLatitude: first.latitude,
      startLongitude: first.longitude,
      endLatitude: last.latitude,
      endLongitude: last.longitude,
    });
  }
  return laps;
}

export interface SeasonTotals {
  readonly rideCount: number;
  readonly distanceMeters: number;
  readonly movingSeconds: number;
  readonly ascentMeters: number;
  readonly calories: number;
  readonly avgSpeedMetersPerSecond: number;
  readonly maxSpeedMetersPerSecond: number;
}

export function seasonTotals(list: ReadonlyArray<Ride> = rides): SeasonTotals {
  const distanceMeters = list.reduce((s, r) => s + (r.summary.totalDistanceMeters ?? 0), 0);
  const movingSeconds = list.reduce((s, r) => s + (r.summary.totalMovingSeconds ?? 0), 0);
  const ascentMeters = list.reduce((s, r) => s + (r.summary.totalAscentMeters ?? 0), 0);
  const calories = list.reduce((s, r) => s + (r.summary.calories ?? 0), 0);
  const maxSpeedMetersPerSecond = Math.max(
    0,
    ...list.map((r) => r.summary.maxSpeedMetersPerSecond ?? 0),
  );
  return {
    rideCount: list.length,
    distanceMeters,
    movingSeconds,
    ascentMeters,
    calories,
    avgSpeedMetersPerSecond: movingSeconds > 0 ? distanceMeters / movingSeconds : 0,
    maxSpeedMetersPerSecond,
  };
}

export interface SeasonBests {
  readonly longest: Ride;
  readonly fastest: Ride;
  readonly climbiest: Ride;
  readonly mostRecent: Ride;
}

export function seasonBests(list: ReadonlyArray<Ride> = rides): SeasonBests | null {
  if (list.length === 0) return null;
  const sorted = [...list].sort(
    (a, b) => Date.parse(a.summary.startTime ?? "") - Date.parse(b.summary.startTime ?? ""),
  );
  const by = (sel: (r: Ride) => number) =>
    list.reduce((best, r) => (sel(r) > sel(best) ? r : best), list[0]!);
  return {
    longest: by((r) => r.summary.totalDistanceMeters ?? 0),
    fastest: by((r) => r.summary.avgSpeedMetersPerSecond ?? 0),
    climbiest: by((r) => r.summary.totalAscentMeters ?? 0),
    mostRecent: sorted[sorted.length - 1]!,
  };
}

export interface MonthBucket {
  readonly month: number;
  readonly label: string;
  readonly distanceMeters: number;
  readonly rideCount: number;
  readonly ascentMeters: number;
}

export function monthly(list: ReadonlyArray<Ride> = rides): MonthBucket[] {
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const buckets: MonthBucket[] = labels.map((label, month) => ({
    month,
    label,
    distanceMeters: 0,
    rideCount: 0,
    ascentMeters: 0,
  }));
  for (const r of list) {
    const d = new Date(r.summary.startTime ?? "");
    if (!Number.isFinite(d.getTime())) continue;
    const m = d.getMonth();
    buckets[m] = {
      ...buckets[m]!,
      distanceMeters: buckets[m]!.distanceMeters + (r.summary.totalDistanceMeters ?? 0),
      ascentMeters: buckets[m]!.ascentMeters + (r.summary.totalAscentMeters ?? 0),
      rideCount: buckets[m]!.rideCount + 1,
    };
  }
  return buckets;
}

export const FEATURED_ID = (() => {
  const bests = seasonBests();
  return bests ? bests.longest.id : rides[0]!.id;
})();

export function featured(): { ride: Ride; detail: ActivityDetailResponse } {
  const id = FEATURED_ID;
  const ride = rideById(id) ?? rides[0]!;
  const detail = rideDetail(id) ?? rideDetail(rides[0]!.id)!;
  return { ride, detail };
}

/* ----------------------------- pure geometry ----------------------------- */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface ProjectOptions {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
}

export interface Bounds {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
}

export function boundsOf(records: ReadonlyArray<Record>): Bounds | null {
  const gps = records.filter(hasGps);
  if (gps.length < 2) return null;
  const lats = gps.map((r) => r.latitude!);
  const lons = gps.map((r) => r.longitude!);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

function hasGps(r: Record): boolean {
  return (
    typeof r.latitude === "number" &&
    typeof r.longitude === "number" &&
    Number.isFinite(r.latitude) &&
    Number.isFinite(r.longitude)
  );
}

export function projectRoute(records: ReadonlyArray<Record>, opts: ProjectOptions): Pt[] {
  const bounds = boundsOf(records);
  if (!bounds) return [];
  return projectBounds(records, bounds, opts);
}

export function projectBounds(
  records: ReadonlyArray<Record>,
  bounds: Bounds,
  opts: ProjectOptions,
): Pt[] {
  const gps = records.filter(hasGps);
  if (gps.length < 2) return [];
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 1e-5);
  const lonRange = Math.max(bounds.maxLon - bounds.minLon, 1e-5);
  const { width, height, padding } = opts;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const scale = Math.min(usableW / lonRange, usableH / latRange);
  const offX = padding + (usableW - lonRange * scale) / 2;
  const offY = padding + (usableH - latRange * scale) / 2;
  return gps.map((r) => ({
    x: offX + (r.longitude! - bounds.minLon) * scale,
    y: offY + (1 - (r.latitude! - bounds.minLat) / latRange) * latRange * scale,
  }));
}

/** All rides projected into one shared geographic frame (for heatmaps). */
export interface HeatPath {
  readonly id: string;
  readonly name: string;
  readonly date: string | null;
  readonly distanceMeters: number;
  readonly pts: Pt[];
}

export function heatmapPaths(opts: ProjectOptions): HeatPath[] {
  let bounds: Bounds | null = null;
  for (const r of rides) {
    const detail = rideDetail(r.id);
    if (!detail) continue;
    const b = boundsOf(detail.records);
    if (!b) continue;
    bounds = bounds
      ? {
          minLat: Math.min(bounds.minLat, b.minLat),
          maxLat: Math.max(bounds.maxLat, b.maxLat),
          minLon: Math.min(bounds.minLon, b.minLon),
          maxLon: Math.max(bounds.maxLon, b.maxLon),
        }
      : b;
  }
  if (!bounds) return [];
  return rides
    .map((r) => {
      const detail = rideDetail(r.id);
      if (!detail) return null;
      const pts = projectBounds(detail.records, bounds!, opts);
      if (pts.length < 2) return null;
      return {
        id: r.id,
        name: r.filename.replace(/\.fit$/, ""),
        date: r.summary.startTime,
        distanceMeters: r.summary.totalDistanceMeters ?? 0,
        pts,
      } satisfies HeatPath;
    })
    .filter((p): p is HeatPath => p !== null);
}

export function globalBounds(): Bounds | null {
  let bounds: Bounds | null = null;
  for (const r of rides) {
    const detail = rideDetail(r.id);
    if (!detail) continue;
    const b = boundsOf(detail.records);
    if (!b) continue;
    bounds = bounds
      ? {
          minLat: Math.min(bounds.minLat, b.minLat),
          maxLat: Math.max(bounds.maxLat, b.maxLat),
          minLon: Math.min(bounds.minLon, b.minLon),
          maxLon: Math.max(bounds.maxLon, b.maxLon),
        }
      : b;
  }
  return bounds;
}

/* ----------------------------- training zones ----------------------------- */

export const HR_MAX = 192;
const ZONE_CEILINGS = [0.6, 0.72, 0.82, 0.89, 0.94, 0.99, Number.POSITIVE_INFINITY];

/** Returns 0..6 for Z1..Z7. */
export function zoneOf(hr: number): number {
  const ratio = hr / HR_MAX;
  for (let i = 0; i < ZONE_CEILINGS.length; i++) {
    if (ratio < ZONE_CEILINGS[i]!) return i;
  }
  return 6;
}

/** Seconds spent in each of the 7 zones for one ride. */
export function rideZones(id: string): number[] {
  const detail = rideDetail(id);
  if (!detail) return Array.from({ length: 7 }).map(() => 0);
  return zoneSeconds(detail.records);
}

/** Seconds in each zone summed across the whole season. */
export function seasonZones(): number[] {
  const totals = Array.from({ length: 7 }).map(() => 0);
  for (const r of rides) {
    const detail = rideDetail(r.id);
    if (!detail) continue;
    const z = zoneSeconds(detail.records);
    for (let i = 0; i < 7; i++) totals[i]! += z[i]!;
  }
  return totals;
}

function zoneSeconds(records: ReadonlyArray<Record>): number[] {
  const totals = Array.from({ length: 7 }).map(() => 0);
  for (let i = 1; i < records.length; i++) {
    const hr = records[i]!.heartRateBpm;
    if (hr == null || hr <= 0) continue;
    const prev = records[i - 1]!.timestamp;
    const cur = records[i]!.timestamp;
    if (!prev || !cur) continue;
    const dt = Math.min(60, Math.max(0.5, (Date.parse(cur) - Date.parse(prev)) / 1000));
    totals[zoneOf(hr)]! += dt;
  }
  return totals;
}

export interface ProfileOptions {
  readonly width: number;
  readonly height: number;
  readonly baseline?: number;
  readonly top?: number;
  readonly smooth?: boolean;
}

export function profilePath(values: ReadonlyArray<number>, opts: ProfileOptions): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-5);
  const { width, height } = opts;
  const baseline = opts.baseline ?? height - 4;
  const top = opts.top ?? 4;
  const span = baseline - top;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = baseline - ((v - min) / range) * span;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function profileArea(values: ReadonlyArray<number>, opts: ProfileOptions): string {
  const line = profilePath(values, opts);
  if (!line) return "";
  const { width, baseline } = { width: opts.width, baseline: opts.baseline ?? opts.height - 4 };
  const last = (values.length - 1) * (width / Math.max(values.length - 1, 1));
  return `${line} L${last.toFixed(2)} ${baseline} L0 ${baseline} Z`;
}

/* ------------------------------ formatters ------------------------------ */

export const km = (m: number | null | undefined): string =>
  m == null || !Number.isFinite(m) ? "—" : `${(m / 1000).toFixed(m >= 10000 ? 1 : 2)}`;

export const kmFull = (m: number | null | undefined): string => `${km(m)} km`;

export const kmh = (ms: number | null | undefined): string =>
  ms == null || !Number.isFinite(ms) ? "—" : `${(ms * 3.6).toFixed(1)}`;

export const kmhFull = (ms: number | null | undefined): string => `${kmh(ms)} km/h`;

export const duration = (s: number | null | undefined): string => {
  if (s == null || !Number.isFinite(s)) return "—";
  const total = Math.max(0, Math.round(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

export const meters = (m: number | null | undefined): string =>
  m == null || !Number.isFinite(m) ? "—" : `${Math.round(m).toLocaleString()} m`;

export const bpm = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? "—" : `${Math.round(v)}`;

export const watts = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? "—" : `${Math.round(v)}`;

export const kcal = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? "—" : `${Math.round(v).toLocaleString()}`;

export const dateShort = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const dateLong = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const dateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const dayNumber = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return String(d.getDate()).padStart(2, "0");
};
