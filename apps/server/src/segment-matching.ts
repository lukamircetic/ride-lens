export interface SegmentRecord {
  readonly activityId: string;
  readonly recordIndex: number;
  readonly timestamp: number | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly altitudeMeters: number | null;
  readonly distanceMeters: number | null;
  readonly speedMetersPerSecond: number | null;
  readonly heartRateBpm: number | null;
  readonly cadenceRpm: number | null;
  readonly powerWatts: number | null;
}

export interface SegmentGeometryPoint {
  readonly recordIndex: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceMeters: number | null;
}

export interface SegmentStats {
  readonly distanceMeters: number | null;
  readonly elapsedSeconds: number | null;
  readonly movingSeconds: number | null;
  readonly averageSpeedMetersPerSecond: number | null;
  readonly maxSpeedMetersPerSecond: number | null;
  readonly averageHeartRateBpm: number | null;
  readonly maxHeartRateBpm: number | null;
  readonly elevationGainMeters: number | null;
  readonly elevationLossMeters: number | null;
  readonly vamMetersPerHour: number | null;
  readonly averageCadenceRpm: number | null;
  readonly averagePowerWatts: number | null;
  readonly normalizedPowerWatts: number | null;
}

export interface SegmentRangeResult {
  readonly startRecordIndex: number;
  readonly endRecordIndex: number;
  readonly startDistanceMeters: number | null;
  readonly endDistanceMeters: number | null;
  readonly startTime: number | null;
  readonly endTime: number | null;
  readonly startLatitude: number | null;
  readonly startLongitude: number | null;
  readonly endLatitude: number | null;
  readonly endLongitude: number | null;
  readonly stats: SegmentStats;
  readonly geometry: ReadonlyArray<SegmentGeometryPoint>;
}

export interface SegmentMatch {
  readonly startRecordIndex: number;
  readonly endRecordIndex: number;
  readonly coverageRatio: number;
  readonly confidence: number;
  readonly averageDeviationMeters: number | null;
  readonly maxDeviationMeters: number | null;
}

export interface SegmentMatchOptions {
  readonly routeToleranceMeters?: number;
  readonly endpointToleranceMeters?: number;
  readonly minCoverageRatio?: number;
}

const DEFAULT_ROUTE_TOLERANCE_METERS = 30;
const DEFAULT_ENDPOINT_TOLERANCE_METERS = 80;
const DEFAULT_MIN_COVERAGE_RATIO = 0.9;
const MAX_GEOMETRY_POINTS = 500;
const MAX_MATCH_SAMPLE_POINTS = 120;
const MOVING_SPEED_THRESHOLD_METERS_PER_SECOND = 0.5;
const MIN_DISTANCE_DELTA_METERS = 0.5;

export const computeSegmentRange = (
  records: ReadonlyArray<SegmentRecord>,
  startRecordIndex: number,
  endRecordIndex: number,
): SegmentRangeResult | null => {
  const start = Math.min(startRecordIndex, endRecordIndex);
  const end = Math.max(startRecordIndex, endRecordIndex);
  const range = records.filter(
    (record) => record.recordIndex >= start && record.recordIndex <= end,
  );
  if (range.length < 2) return null;

  const first = range[0];
  const last = range.at(-1);
  if (!first || !last) return null;

  const geometry = thinGeometryPoints(
    range.flatMap((record) =>
      record.latitude === null || record.longitude === null
        ? []
        : [
            {
              recordIndex: record.recordIndex,
              latitude: record.latitude,
              longitude: record.longitude,
              distanceMeters: record.distanceMeters,
            },
          ],
    ),
    MAX_GEOMETRY_POINTS,
  );

  return {
    startRecordIndex: first.recordIndex,
    endRecordIndex: last.recordIndex,
    startDistanceMeters: first.distanceMeters,
    endDistanceMeters: last.distanceMeters,
    startTime: first.timestamp,
    endTime: last.timestamp,
    startLatitude: first.latitude,
    startLongitude: first.longitude,
    endLatitude: last.latitude,
    endLongitude: last.longitude,
    stats: computeSegmentStats(range),
    geometry,
  };
};

export const findSegmentMatches = (
  sourceGeometry: ReadonlyArray<SegmentGeometryPoint>,
  records: ReadonlyArray<SegmentRecord>,
  options: SegmentMatchOptions = {},
): ReadonlyArray<SegmentMatch> => {
  const routeToleranceMeters = options.routeToleranceMeters ?? DEFAULT_ROUTE_TOLERANCE_METERS;
  const endpointToleranceMeters =
    options.endpointToleranceMeters ?? DEFAULT_ENDPOINT_TOLERANCE_METERS;
  const minCoverageRatio = options.minCoverageRatio ?? DEFAULT_MIN_COVERAGE_RATIO;
  const routeRecords = records.filter(hasGps);
  if (sourceGeometry.length < 2 || routeRecords.length < 2) return [];

  const sourceStart = sourceGeometry[0];
  const sourceEnd = sourceGeometry.at(-1);
  if (!sourceStart || !sourceEnd) return [];

  const sourceDistance = geometryDistance(sourceGeometry);
  const matches: Array<SegmentMatch> = [];
  let searchAfterIndex = -1;

  while (true) {
    let best: SegmentMatch | null = null;
    const candidateStarts = routeRecords.filter(
      (record) =>
        record.recordIndex > searchAfterIndex &&
        haversineMeters(
          record.latitude,
          record.longitude,
          sourceStart.latitude,
          sourceStart.longitude,
        ) <= endpointToleranceMeters,
    );

    for (const start of candidateStarts) {
      const candidateEnds = routeRecords.filter(
        (record) =>
          record.recordIndex > start.recordIndex &&
          haversineMeters(
            record.latitude,
            record.longitude,
            sourceEnd.latitude,
            sourceEnd.longitude,
          ) <= endpointToleranceMeters,
      );

      for (const end of candidateEnds) {
        const candidateSlice = routeRecords.filter(
          (record) =>
            record.recordIndex >= start.recordIndex && record.recordIndex <= end.recordIndex,
        );
        if (candidateSlice.length < 2) continue;

        const candidateDistance = rangeDistance(candidateSlice);
        if (sourceDistance !== null && candidateDistance !== null) {
          const ratio = candidateDistance / sourceDistance;
          if (ratio < 0.55 || ratio > 1.45) continue;
        }

        const evaluated = evaluateMatch(sourceGeometry, candidateSlice, routeToleranceMeters);
        if (evaluated.coverageRatio < minCoverageRatio) continue;

        const candidate: SegmentMatch = {
          startRecordIndex: start.recordIndex,
          endRecordIndex: end.recordIndex,
          ...evaluated,
        };

        if (best === null || candidate.confidence > best.confidence) {
          best = candidate;
        }
      }
    }

    if (best === null) break;
    matches.push(best);
    searchAfterIndex = best.endRecordIndex;
  }

  return matches;
};

const computeSegmentStats = (range: ReadonlyArray<SegmentRecord>): SegmentStats => {
  const first = range[0];
  const last = range.at(-1);
  const distanceMeters = first && last ? recordRangeDistance(range) : null;
  const elapsedSeconds =
    first?.timestamp !== null && last?.timestamp !== null && first?.timestamp !== undefined
      ? Math.max(0, ((last?.timestamp ?? first.timestamp) - first.timestamp) / 1000)
      : null;
  const movingSeconds = computeMovingSeconds(range);
  const speeds = finiteNumbers(range.map((record) => record.speedMetersPerSecond));
  const heartRates = finiteNumbers(range.map((record) => record.heartRateBpm));
  const cadences = finiteNumbers(range.map((record) => record.cadenceRpm));
  const powers = finiteNumbers(range.map((record) => record.powerWatts));
  const elevation = computeElevation(range);
  const averageSpeedMetersPerSecond =
    distanceMeters !== null && elapsedSeconds !== null && elapsedSeconds > 0
      ? distanceMeters / elapsedSeconds
      : average(speeds);

  return {
    distanceMeters,
    elapsedSeconds,
    movingSeconds,
    averageSpeedMetersPerSecond,
    maxSpeedMetersPerSecond: speeds.length > 0 ? Math.max(...speeds) : null,
    averageHeartRateBpm: average(heartRates),
    maxHeartRateBpm: heartRates.length > 0 ? Math.max(...heartRates) : null,
    elevationGainMeters: elevation.gain,
    elevationLossMeters: elevation.loss,
    vamMetersPerHour:
      elevation.gain !== null && elapsedSeconds !== null && elapsedSeconds > 0
        ? elevation.gain / (elapsedSeconds / 3600)
        : null,
    averageCadenceRpm: average(cadences),
    averagePowerWatts: average(powers),
    normalizedPowerWatts: null,
  };
};

const computeMovingSeconds = (range: ReadonlyArray<SegmentRecord>): number | null => {
  let moving = 0;
  let hasInterval = false;

  for (let index = 1; index < range.length; index += 1) {
    const previous = range[index - 1];
    const current = range[index];
    if (previous?.timestamp === null || current?.timestamp === null) continue;
    if (previous?.timestamp === undefined || current?.timestamp === undefined) continue;

    const duration = Math.max(0, (current.timestamp - previous.timestamp) / 1000);
    const distanceDelta =
      previous.distanceMeters !== null && current.distanceMeters !== null
        ? current.distanceMeters - previous.distanceMeters
        : hasGps(previous) && hasGps(current)
          ? haversineMeters(
              previous.latitude,
              previous.longitude,
              current.latitude,
              current.longitude,
            )
          : null;
    const speed = current.speedMetersPerSecond ?? previous.speedMetersPerSecond;

    hasInterval = true;
    if (
      (distanceDelta !== null && distanceDelta > MIN_DISTANCE_DELTA_METERS) ||
      (speed !== null && speed > MOVING_SPEED_THRESHOLD_METERS_PER_SECOND)
    ) {
      moving += duration;
    }
  }

  return hasInterval ? moving : null;
};

const computeElevation = (
  range: ReadonlyArray<SegmentRecord>,
): { readonly gain: number | null; readonly loss: number | null } => {
  let gain = 0;
  let loss = 0;
  let hasAltitude = false;

  for (let index = 1; index < range.length; index += 1) {
    const previous = range[index - 1]?.altitudeMeters;
    const current = range[index]?.altitudeMeters;
    if (previous === null || current === null || previous === undefined || current === undefined) {
      continue;
    }

    hasAltitude = true;
    const delta = current - previous;
    if (delta > 0) gain += delta;
    if (delta < 0) loss += Math.abs(delta);
  }

  return hasAltitude ? { gain, loss } : { gain: null, loss: null };
};

const evaluateMatch = (
  sourceGeometry: ReadonlyArray<SegmentGeometryPoint>,
  candidateRecords: ReadonlyArray<
    SegmentRecord & { readonly latitude: number; readonly longitude: number }
  >,
  routeToleranceMeters: number,
): Omit<SegmentMatch, "startRecordIndex" | "endRecordIndex"> => {
  const sourceSamples = thinGeometryPoints(sourceGeometry, MAX_MATCH_SAMPLE_POINTS);
  const candidateGeometry = candidateRecords.map((record) => ({
    recordIndex: record.recordIndex,
    latitude: record.latitude,
    longitude: record.longitude,
    distanceMeters: record.distanceMeters,
  }));
  const deviations = sourceSamples.map((point) => pointToRouteMeters(point, candidateGeometry));
  const covered = deviations.filter((distance) => distance <= routeToleranceMeters).length;
  const coverageRatio = sourceSamples.length === 0 ? 0 : covered / sourceSamples.length;
  const averageDeviationMeters = average(deviations);
  const maxDeviationMeters = deviations.length > 0 ? Math.max(...deviations) : null;
  const confidence = clamp01(
    coverageRatio - (averageDeviationMeters === null ? 0.1 : averageDeviationMeters / 200),
  );

  return {
    coverageRatio,
    confidence,
    averageDeviationMeters,
    maxDeviationMeters,
  };
};

const recordRangeDistance = (range: ReadonlyArray<SegmentRecord>): number | null => {
  const first = range[0];
  const last = range.at(-1);
  if (!first || !last) return null;

  if (first.distanceMeters !== null && last.distanceMeters !== null) {
    return Math.max(0, last.distanceMeters - first.distanceMeters);
  }

  return rangeDistance(range);
};

const rangeDistance = (range: ReadonlyArray<SegmentRecord>): number | null => {
  let distance = 0;
  let hasDistance = false;
  for (let index = 1; index < range.length; index += 1) {
    const previous = range[index - 1];
    const current = range[index];
    if (!previous || !current || !hasGps(previous) || !hasGps(current)) continue;

    distance += haversineMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
    hasDistance = true;
  }

  return hasDistance ? distance : null;
};

const geometryDistance = (geometry: ReadonlyArray<SegmentGeometryPoint>): number | null => {
  let distance = 0;
  for (let index = 1; index < geometry.length; index += 1) {
    const previous = geometry[index - 1];
    const current = geometry[index];
    if (!previous || !current) continue;
    distance += haversineMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
  }

  return geometry.length >= 2 ? distance : null;
};

const pointToRouteMeters = (
  point: SegmentGeometryPoint,
  route: ReadonlyArray<SegmentGeometryPoint>,
): number => {
  if (route.length === 0) return Number.POSITIVE_INFINITY;
  if (route.length === 1) {
    const only = route[0];
    return only
      ? haversineMeters(point.latitude, point.longitude, only.latitude, only.longitude)
      : Number.POSITIVE_INFINITY;
  }

  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    if (!start || !end) continue;
    best = Math.min(best, pointToSegmentMeters(point, start, end));
  }
  return best;
};

const pointToSegmentMeters = (
  point: SegmentGeometryPoint,
  start: SegmentGeometryPoint,
  end: SegmentGeometryPoint,
): number => {
  const originLat = point.latitude;
  const p = projectMeters(point, originLat);
  const a = projectMeters(start, originLat);
  const b = projectMeters(end, originLat);
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abLengthSquared = abX * abX + abY * abY;
  if (abLengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  const t = clamp01(((p.x - a.x) * abX + (p.y - a.y) * abY) / abLengthSquared);
  const closestX = a.x + abX * t;
  const closestY = a.y + abY * t;
  return Math.hypot(p.x - closestX, p.y - closestY);
};

const thinGeometryPoints = <A>(points: ReadonlyArray<A>, maxPoints: number): ReadonlyArray<A> => {
  if (points.length <= maxPoints) return points;
  const thinned: Array<A> = [];
  const lastIndex = points.length - 1;
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * lastIndex);
    const point = points[sourceIndex];
    if (point !== undefined) thinned.push(point);
  }
  return thinned;
};

const hasGps = <A extends { readonly latitude: number | null; readonly longitude: number | null }>(
  record: A,
): record is A & { readonly latitude: number; readonly longitude: number } =>
  record.latitude !== null &&
  record.longitude !== null &&
  Number.isFinite(record.latitude) &&
  Number.isFinite(record.longitude);

export const haversineMeters = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number => {
  const earthRadiusMeters = 6_371_000;
  const phiA = toRadians(latitudeA);
  const phiB = toRadians(latitudeB);
  const deltaPhi = toRadians(latitudeB - latitudeA);
  const deltaLambda = toRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(deltaPhi / 2) ** 2 + Math.cos(phiA) * Math.cos(phiB) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
};

const projectMeters = (
  point: { readonly latitude: number; readonly longitude: number },
  originLatitude: number,
): { readonly x: number; readonly y: number } => {
  const earthRadiusMeters = 6_371_000;
  return {
    x: toRadians(point.longitude) * earthRadiusMeters * Math.cos(toRadians(originLatitude)),
    y: toRadians(point.latitude) * earthRadiusMeters,
  };
};

const finiteNumbers = (values: ReadonlyArray<number | null>): ReadonlyArray<number> =>
  values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

const average = (values: ReadonlyArray<number>): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);
