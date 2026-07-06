import { Decoder, Stream } from "@garmin/fitsdk";
import type { FitMessages, LapMesg, RecordMesg, SessionMesg } from "@garmin/fitsdk";
import type { FitImportResponse } from "@ride-lens/api";

type FitActivitySummary = FitImportResponse["summary"];

export interface ParsedActivityRecord {
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
  readonly temperatureCelsius: number | null;
  readonly gradePercent: number | null;
  readonly gpsAccuracyMeters: number | null;
}

export interface ParsedActivityLap {
  readonly lapIndex: number;
  readonly startTime: number | null;
  readonly endTime: number | null;
  readonly totalDistanceMeters: number | null;
  readonly totalElapsedSeconds: number | null;
  readonly totalTimerSeconds: number | null;
  readonly avgSpeedMetersPerSecond: number | null;
  readonly maxSpeedMetersPerSecond: number | null;
  readonly avgHeartRateBpm: number | null;
  readonly maxHeartRateBpm: number | null;
  readonly avgPowerWatts: number | null;
  readonly maxPowerWatts: number | null;
  readonly avgCadenceRpm: number | null;
  readonly totalAscentMeters: number | null;
  readonly totalDescentMeters: number | null;
  readonly startLatitude: number | null;
  readonly startLongitude: number | null;
  readonly endLatitude: number | null;
  readonly endLongitude: number | null;
}

export interface ParsedFitActivity {
  readonly summary: FitActivitySummary;
  readonly records: ReadonlyArray<ParsedActivityRecord>;
  readonly laps: ReadonlyArray<ParsedActivityLap>;
}

export class FitParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FitParseError";
  }
}

const FIT_DECODER_OPTIONS = {
  applyScaleAndOffset: true,
  expandSubFields: true,
  expandComponents: true,
  convertTypesToStrings: true,
  convertDateTimesToDates: true,
  includeUnknownData: false,
  mergeHeartRates: true,
  decodeMemoGlobs: false,
} as const;

export const parseFitActivity = (bytes: Uint8Array): ParsedFitActivity => {
  const stream = Stream.fromBuffer(bytes);
  const decoder = new Decoder(stream);

  if (!decoder.isFIT()) {
    throw new FitParseError("File is not a FIT file");
  }

  if (!decoder.checkIntegrity()) {
    throw new FitParseError("FIT file failed integrity checks");
  }

  const { messages, errors } = decoder.read(FIT_DECODER_OPTIONS);

  if (errors.length > 0) {
    throw new FitParseError(`FIT decoder returned ${errors.length} error(s)`);
  }

  return {
    summary: summarizeFitMessages(messages),
    records: parseRecordMessages(messages.recordMesgs ?? []),
    laps: parseLapMessages(messages.lapMesgs ?? []),
  };
};

const summarizeFitMessages = (messages: FitMessages): FitActivitySummary => {
  const sessions = messages.sessionMesgs ?? [];
  const records = messages.recordMesgs ?? [];
  const session = sessions[0] ?? null;
  const startTime = getStartTime(session, records);
  const endTime = getEndTime(session, records, startTime);
  const startPosition = getStartPosition(session, records);

  return {
    startTime: dateToIso(startTime),
    endTime: dateToIso(endTime),
    sport: toNullableString(session?.sport ?? messages.sportMesgs?.[0]?.sport),
    subSport: toNullableString(session?.subSport ?? messages.sportMesgs?.[0]?.subSport),
    totalDistanceMeters: toNullableNumber(session?.totalDistance),
    totalElapsedSeconds: toNullableNumber(session?.totalElapsedTime),
    totalTimerSeconds: toNullableNumber(session?.totalTimerTime),
    totalMovingSeconds: toNullableNumber(session?.totalMovingTime),
    totalAscentMeters: toNullableNumber(session?.totalAscent),
    totalDescentMeters: toNullableNumber(session?.totalDescent),
    calories: toNullableNumber(session?.totalCalories),
    avgSpeedMetersPerSecond: toNullableNumber(session?.enhancedAvgSpeed ?? session?.avgSpeed),
    maxSpeedMetersPerSecond: toNullableNumber(session?.enhancedMaxSpeed ?? session?.maxSpeed),
    avgHeartRateBpm: toNullableNumber(session?.avgHeartRate),
    maxHeartRateBpm: toNullableNumber(session?.maxHeartRate),
    avgPowerWatts: toNullableNumber(session?.avgPower),
    maxPowerWatts: toNullableNumber(session?.maxPower),
    normalizedPowerWatts: toNullableNumber(session?.normalizedPower),
    avgCadenceRpm: toNullableNumber(session?.avgCadence),
    startLatitude: startPosition.latitude,
    startLongitude: startPosition.longitude,
    recordCount: records.length,
    lapCount: messages.lapMesgs?.length ?? 0,
    sessionCount: sessions.length,
    hasGps: hasGpsData(session, records),
  };
};

const getStartTime = (
  session: SessionMesg | null,
  records: ReadonlyArray<RecordMesg>,
): Date | null => toDate(session?.startTime) ?? toDate(records[0]?.timestamp) ?? null;

const getEndTime = (
  session: SessionMesg | null,
  records: ReadonlyArray<RecordMesg>,
  startTime: Date | null,
): Date | null => {
  if (startTime && typeof session?.totalElapsedTime === "number") {
    return new Date(startTime.getTime() + session.totalElapsedTime * 1000);
  }

  return toDate(session?.timestamp) ?? toDate(records.at(-1)?.timestamp) ?? null;
};

const getStartPosition = (
  session: SessionMesg | null,
  records: ReadonlyArray<RecordMesg>,
): { readonly latitude: number | null; readonly longitude: number | null } => {
  const latitude = semicirclesToDegrees(session?.startPositionLat ?? records[0]?.positionLat);
  const longitude = semicirclesToDegrees(session?.startPositionLong ?? records[0]?.positionLong);

  return { latitude, longitude };
};

const hasGpsData = (session: SessionMesg | null, records: ReadonlyArray<RecordMesg>): boolean =>
  (session?.startPositionLat !== undefined && session.startPositionLong !== undefined) ||
  records.some((record) => record.positionLat !== undefined && record.positionLong !== undefined);

const parseRecordMessages = (
  records: ReadonlyArray<RecordMesg>,
): ReadonlyArray<ParsedActivityRecord> =>
  records.map((record, recordIndex) => ({
    recordIndex,
    timestamp: dateToEpochMs(toDate(record.timestamp)),
    latitude: semicirclesToDegrees(record.positionLat),
    longitude: semicirclesToDegrees(record.positionLong),
    altitudeMeters: toNullableNumber(record.enhancedAltitude ?? record.altitude),
    distanceMeters: toNullableNumber(record.distance),
    speedMetersPerSecond: toNullableNumber(record.enhancedSpeed ?? record.speed),
    heartRateBpm: toNullableNumber(record.heartRate),
    cadenceRpm: toNullableNumber(record.cadence),
    powerWatts: toNullableNumber(record.power),
    temperatureCelsius: toNullableNumber(record.temperature),
    gradePercent: toNullableNumber(record.grade),
    gpsAccuracyMeters: toNullableNumber(record.gpsAccuracy),
  }));

const parseLapMessages = (laps: ReadonlyArray<LapMesg>): ReadonlyArray<ParsedActivityLap> =>
  laps.map((lap, lapIndex) => ({
    lapIndex,
    startTime: dateToEpochMs(toDate(lap.startTime)),
    endTime: dateToEpochMs(getLapEndTime(lap)),
    totalDistanceMeters: toNullableNumber(lap.totalDistance),
    totalElapsedSeconds: toNullableNumber(lap.totalElapsedTime),
    totalTimerSeconds: toNullableNumber(lap.totalTimerTime),
    avgSpeedMetersPerSecond: toNullableNumber(lap.enhancedAvgSpeed ?? lap.avgSpeed),
    maxSpeedMetersPerSecond: toNullableNumber(lap.enhancedMaxSpeed ?? lap.maxSpeed),
    avgHeartRateBpm: toNullableNumber(lap.avgHeartRate),
    maxHeartRateBpm: toNullableNumber(lap.maxHeartRate),
    avgPowerWatts: toNullableNumber(lap.avgPower),
    maxPowerWatts: toNullableNumber(lap.maxPower),
    avgCadenceRpm: toNullableNumber(lap.avgCadence),
    totalAscentMeters: toNullableNumber(lap.totalAscent),
    totalDescentMeters: toNullableNumber(lap.totalDescent),
    startLatitude: semicirclesToDegrees(lap.startPositionLat),
    startLongitude: semicirclesToDegrees(lap.startPositionLong),
    endLatitude: semicirclesToDegrees(lap.endPositionLat),
    endLongitude: semicirclesToDegrees(lap.endPositionLong),
  }));

const getLapEndTime = (lap: LapMesg): Date | null => {
  const timestamp = toDate(lap.timestamp);
  if (timestamp) {
    return timestamp;
  }

  const startTime = toDate(lap.startTime);
  if (startTime && typeof lap.totalElapsedTime === "number") {
    return new Date(startTime.getTime() + lap.totalElapsedTime * 1000);
  }

  return null;
};

const semicirclesToDegrees = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value * (180 / 2 ** 31);
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const dateToIso = (date: Date | null): string | null => date?.toISOString() ?? null;

const dateToEpochMs = (date: Date | null): number | null => date?.getTime() ?? null;

const toNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
