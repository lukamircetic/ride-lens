import { Encoder, Profile } from "@garmin/fitsdk";
import type {
  Encodable,
  FileIdMesg,
  LapMesg,
  RecordMesg,
  SessionMesg,
  SportMesg,
} from "@garmin/fitsdk";
import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
  FitImportResponse,
} from "@ride-lens/api";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { makeWebHandler } from "./app";
import type { WeatherClient } from "./weather";

const dataDir = await mkdtemp(join(tmpdir(), "ride-lens-server-"));
const weatherClient = {
  fetchHistoricalWeather: async () => ({
    latitude: 43.658,
    longitude: -79.389,
    hourly: {
      time: ["2026-01-15T13:00", "2026-01-15T14:00"],
      temperature_2m: [4, 5],
      precipitation: [0, 0.2],
      wind_speed_10m: [5, 7],
      wind_direction_10m: [270, 280],
      wind_gusts_10m: [8, 10],
    },
  }),
} satisfies WeatherClient;
const { handler, dispose } = makeWebHandler({ dataDir, weather: { client: weatherClient } });

afterAll(async () => {
  await dispose();
  await rm(dataDir, { force: true, recursive: true });
});

const getMesgNum = (name: string): number => {
  const mesgNum = Profile.MesgNum[name];

  if (mesgNum === undefined) {
    throw new Error(`Missing FIT message number for ${name}`);
  }

  return mesgNum;
};

const degreesToSemicircles = (degrees: number): number => Math.round(degrees * (2 ** 31 / 180));

const makeRideFitFile = (): Uint8Array => {
  const encoder = new Encoder();
  const startTime = new Date("2026-01-15T13:00:00.000Z");
  const startPositionLat = degreesToSemicircles(43.6532);
  const startPositionLong = degreesToSemicircles(-79.3832);
  const endPositionLat = degreesToSemicircles(43.6629);
  const endPositionLong = degreesToSemicircles(-79.3957);

  const fileIdMesg = {
    mesgNum: getMesgNum("FILE_ID"),
    type: "activity",
    manufacturer: "garmin",
    product: 1,
    timeCreated: startTime,
  } satisfies Encodable<FileIdMesg>;

  const sportMesg = {
    mesgNum: getMesgNum("SPORT"),
    sport: "cycling",
    subSport: "road",
  } satisfies Encodable<SportMesg>;

  const firstRecordMesg = {
    mesgNum: getMesgNum("RECORD"),
    timestamp: startTime,
    positionLat: startPositionLat,
    positionLong: startPositionLong,
    distance: 0,
    enhancedSpeed: 6.5,
    enhancedAltitude: 84,
    heartRate: 135,
    cadence: 82,
    power: 205,
    temperature: 18,
    grade: 1.2,
    gpsAccuracy: 3,
  } satisfies Encodable<RecordMesg>;

  const secondRecordMesg = {
    mesgNum: getMesgNum("RECORD"),
    timestamp: new Date("2026-01-15T13:01:00.000Z"),
    positionLat: endPositionLat,
    positionLong: endPositionLong,
    distance: 420,
    enhancedSpeed: 7.1,
    enhancedAltitude: 88,
    heartRate: 142,
    cadence: 86,
    power: 220,
    temperature: 18,
    grade: 0.8,
    gpsAccuracy: 3,
  } satisfies Encodable<RecordMesg>;

  const lapMesg = {
    mesgNum: getMesgNum("LAP"),
    timestamp: new Date("2026-01-15T14:05:00.000Z"),
    startTime,
    event: "lap",
    eventType: "stop",
    startPositionLat,
    startPositionLong,
    endPositionLat,
    endPositionLong,
    totalElapsedTime: 3900,
    totalTimerTime: 3600,
    totalDistance: 25000,
    enhancedAvgSpeed: 6.94,
    enhancedMaxSpeed: 12.3,
    avgHeartRate: 142,
    maxHeartRate: 181,
    avgPower: 210,
    maxPower: 640,
    avgCadence: 86,
    totalAscent: 340,
    totalDescent: 335,
  } satisfies Encodable<LapMesg>;

  const sessionMesg = {
    mesgNum: getMesgNum("SESSION"),
    timestamp: new Date("2026-01-15T14:00:00.000Z"),
    startTime,
    event: "session",
    eventType: "stop",
    sport: "cycling",
    subSport: "road",
    startPositionLat,
    startPositionLong,
    totalElapsedTime: 3900,
    totalTimerTime: 3600,
    totalMovingTime: 3540,
    totalDistance: 25000,
    avgSpeed: 6.94,
    maxSpeed: 12.3,
    avgHeartRate: 142,
    maxHeartRate: 181,
    avgPower: 210,
    maxPower: 640,
    normalizedPower: 232,
    avgCadence: 86,
    totalAscent: 340,
    totalDescent: 335,
    totalCalories: 820,
  } satisfies Encodable<SessionMesg>;

  encoder.writeMesg(fileIdMesg);
  encoder.writeMesg(sportMesg);
  encoder.writeMesg(firstRecordMesg);
  encoder.writeMesg(secondRecordMesg);
  encoder.writeMesg(lapMesg);
  encoder.writeMesg(sessionMesg);

  return encoder.close();
};

describe("Ride Lens API", () => {
  it("serves health from the Effect HttpApi contract", async () => {
    const response = await handler(new Request("http://ride-lens.test/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("serves the OpenAPI document", async () => {
    const response = await handler(new Request("http://ride-lens.test/openapi.json"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      info: {
        title: "Ride Lens API",
        version: "0.0.0",
      },
    });
  });

  it("accepts a FIT file import", async () => {
    const form = new FormData();
    form.append("file", new Blob([makeRideFitFile()]), "morning-ride.fit");

    const response = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      importId: expect.any(String),
      filename: "morning-ride.fit",
      source: "fit",
      status: "parsed",
      summary: {
        startTime: "2026-01-15T13:00:00.000Z",
        endTime: "2026-01-15T14:05:00.000Z",
        sport: "cycling",
        subSport: "road",
        totalDistanceMeters: 25000,
        totalElapsedSeconds: 3900,
        totalTimerSeconds: 3600,
        totalMovingSeconds: 3540,
        avgPowerWatts: 210,
        normalizedPowerWatts: 232,
        startLatitude: expect.any(Number),
        startLongitude: expect.any(Number),
        recordCount: 2,
        lapCount: 1,
        sessionCount: 1,
        hasGps: true,
      },
    });
  });

  it("lists imported activities and serves activity detail", async () => {
    const form = new FormData();
    form.append("file", new Blob([makeRideFitFile()]), "morning-ride.fit");

    const importResponse = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: form,
      }),
    );
    const imported = (await importResponse.json()) as FitImportResponse;

    const listResponse = await handler(new Request("http://ride-lens.test/api/activities"));
    expect(listResponse.status).toBe(200);

    const listBody = (await listResponse.json()) as ActivityListResponse;
    expect(listBody.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: imported.importId,
          filename: "morning-ride.fit",
          source: "fit",
          importedAt: expect.any(String),
          summary: expect.objectContaining({
            totalDistanceMeters: 25000,
            recordCount: 2,
            lapCount: 1,
          }),
        }),
      ]),
    );

    const detailResponse = await handler(
      new Request(`http://ride-lens.test/api/activities/${imported.importId}`),
    );
    expect(detailResponse.status).toBe(200);

    const detailBody = (await detailResponse.json()) as ActivityDetailResponse;
    expect(detailBody.activity.id).toBe(imported.importId);
    expect(detailBody.weather).toMatchObject({
      provider: "open-meteo",
      model: "best_match",
      observationCount: 2,
      sampleCount: 1,
      averageTemperatureCelsius: 4.5,
      totalPrecipitationMillimeters: 0.2,
      averageWindSpeedMetersPerSecond: 6,
      maxWindGustMetersPerSecond: 10,
      averageAirSpeedMetersPerSecond: expect.any(Number),
      maxHeadwindMetersPerSecond: expect.any(Number),
      maxTailwindMetersPerSecond: expect.any(Number),
      headwindDistanceMeters: expect.any(Number),
      tailwindDistanceMeters: expect.any(Number),
      longestHeadwindMeters: expect.any(Number),
      windBurdenScore: expect.any(Number),
    });
    expect(detailBody.records).toHaveLength(2);
    expect(detailBody.records[0]).toMatchObject({
      recordIndex: 0,
      heartRateBpm: 135,
      powerWatts: 205,
      gpsAccuracyMeters: 3,
    });
    expect(detailBody.laps).toHaveLength(1);
    expect(detailBody.laps[0]).toMatchObject({
      lapIndex: 0,
      totalDistanceMeters: 25000,
      avgPowerWatts: 210,
    });
  });

  it("lists lightweight activity routes for map rendering", async () => {
    const form = new FormData();
    form.append("file", new Blob([makeRideFitFile()]), "morning-ride.fit");

    const importResponse = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: form,
      }),
    );
    const imported = (await importResponse.json()) as FitImportResponse;

    const routesResponse = await handler(
      new Request("http://ride-lens.test/api/activities/routes"),
    );
    expect(routesResponse.status).toBe(200);

    const routesBody = (await routesResponse.json()) as ActivityRoutesResponse;
    expect(routesBody.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activity: expect.objectContaining({ id: imported.importId }),
          points: [
            expect.objectContaining({
              recordIndex: 0,
              latitude: expect.any(Number),
              longitude: expect.any(Number),
              heartRateBpm: 135,
              speedMetersPerSecond: 6.5,
            }),
            expect.objectContaining({
              recordIndex: 1,
              latitude: expect.any(Number),
              longitude: expect.any(Number),
              heartRateBpm: 142,
              speedMetersPerSecond: 7.1,
            }),
          ],
        }),
      ]),
    );
  });

  it("returns 404 for unknown activity detail", async () => {
    const response = await handler(
      new Request("http://ride-lens.test/api/activities/not-an-activity-id"),
    );

    expect(response.status).toBe(404);
  });

  it("returns the existing import for duplicate FIT uploads", async () => {
    const bytes = makeRideFitFile();
    const makeRequest = () => {
      const form = new FormData();
      form.append("file", new Blob([bytes]), "morning-ride.fit");

      return new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: form,
      });
    };

    const firstResponse = await handler(makeRequest());
    const secondResponse = await handler(makeRequest());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const firstBody = (await firstResponse.json()) as FitImportResponse;
    const secondBody = (await secondResponse.json()) as FitImportResponse;

    expect(secondBody.importId).toBe(firstBody.importId);
    expect(secondBody.summary.recordCount).toBe(2);
  });

  it("rejects invalid FIT file contents", async () => {
    const form = new FormData();
    form.append("file", new Blob(["not a fit file"]), "broken.fit");

    const response = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects non-FIT file imports", async () => {
    const form = new FormData();
    form.append("file", new Blob(["not a fit file"]), "notes.txt");

    const response = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(400);
  });
});
