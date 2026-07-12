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
  ActivitySegmentsResponse,
  FitImportResponse,
  SegmentDetailResponse,
  SegmentListResponse,
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
const AUTH_BASE_URL = "http://ride-lens.test";
const { handler: rawHandler, dispose } = makeWebHandler({
  dataDir,
  auth: {
    baseURL: AUTH_BASE_URL,
    secret: "ride-lens-test-secret-at-least-32-characters",
  },
  weather: { client: weatherClient },
});

const createTestSession = async (input: {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}) => {
  const response = await rawHandler(
    new Request(`${AUTH_BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: AUTH_BASE_URL,
      },
      body: JSON.stringify(input),
    }),
  );

  if (!response.ok) {
    throw new Error(`Could not create test session: ${response.status}`);
  }

  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => value !== undefined)
    .join("; ");
  if (!cookie) {
    throw new Error("Better Auth did not return a session cookie");
  }

  return cookie;
};

const PRIMARY_COOKIE = await createTestSession({
  name: "Primary Rider",
  email: "primary@ride-lens.test",
  password: "primary-test-password",
});
const SECONDARY_COOKIE = await createTestSession({
  name: "Secondary Rider",
  email: "secondary@ride-lens.test",
  password: "secondary-test-password",
});

const handler = (request: Request) => {
  const url = new URL(request.url);
  if (
    !url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/api/auth/") ||
    request.headers.has("cookie")
  ) {
    return rawHandler(request);
  }

  const headers = new Headers(request.headers);
  headers.set("cookie", PRIMARY_COOKIE);
  return rawHandler(new Request(request, { headers }));
};

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

const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

const makeRideFitFile = (
  options: {
    readonly startTime?: Date;
    readonly latitudeOffset?: number;
    readonly longitudeOffset?: number;
  } = {},
): Uint8Array => {
  const encoder = new Encoder();
  const startTime = options.startTime ?? new Date("2026-01-15T13:00:00.000Z");
  const latitudeOffset = options.latitudeOffset ?? 0;
  const longitudeOffset = options.longitudeOffset ?? 0;
  const startPositionLat = degreesToSemicircles(43.6532 + latitudeOffset);
  const startPositionLong = degreesToSemicircles(-79.3832 + longitudeOffset);
  const endPositionLat = degreesToSemicircles(43.6629 + latitudeOffset);
  const endPositionLong = degreesToSemicircles(-79.3957 + longitudeOffset);

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
    timestamp: addSeconds(startTime, 60),
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
    timestamp: addSeconds(startTime, 3900),
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
    timestamp: addSeconds(startTime, 3600),
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

  it("rejects unauthenticated API requests", async () => {
    const response = await rawHandler(new Request("http://ride-lens.test/api/activities"));

    expect(response.status).toBe(401);
  });

  it("serves the authenticated Better Auth session", async () => {
    const response = await rawHandler(
      new Request(`${AUTH_BASE_URL}/api/auth/get-session`, {
        headers: { cookie: PRIMARY_COOKIE },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: {
        name: "Primary Rider",
        email: "primary@ride-lens.test",
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

  it("creates a manual segment and matches a similar ride", async () => {
    const firstForm = new FormData();
    firstForm.append("file", new Blob([makeRideFitFile()]), "segment-source.fit");
    const firstImportResponse = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: firstForm,
      }),
    );
    const firstImported = (await firstImportResponse.json()) as FitImportResponse;

    const secondForm = new FormData();
    secondForm.append(
      "file",
      new Blob([
        makeRideFitFile({
          startTime: new Date("2026-01-15T13:10:00.000Z"),
          latitudeOffset: 0.00002,
          longitudeOffset: 0.00002,
        }),
      ]),
      "segment-match.fit",
    );
    const secondImportResponse = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: secondForm,
      }),
    );
    const secondImported = (await secondImportResponse.json()) as FitImportResponse;

    const createResponse = await handler(
      new Request("http://ride-lens.test/api/segments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          activityId: firstImported.importId,
          name: "Downtown test segment",
          startRecordIndex: 0,
          endRecordIndex: 1,
        }),
      }),
    );

    expect(createResponse.status).toBe(200);
    const createBody = (await createResponse.json()) as SegmentDetailResponse;
    expect(createBody.segment).toMatchObject({
      name: "Downtown test segment",
      sourceActivityId: firstImported.importId,
      startRecordIndex: 0,
      endRecordIndex: 1,
      stats: expect.objectContaining({
        distanceMeters: 420,
        elapsedSeconds: 60,
        averageHeartRateBpm: 138.5,
        elevationGainMeters: 4,
      }),
    });
    expect(createBody.efforts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityId: firstImported.importId,
          source: "source",
          attemptIndex: 1,
        }),
        expect.objectContaining({
          activityId: secondImported.importId,
          source: "matched",
          attemptIndex: 1,
          coverageRatio: 1,
        }),
      ]),
    );

    const updateResponse = await handler(
      new Request(`http://ride-lens.test/api/segments/${createBody.segment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Downtown edited segment",
          startRecordIndex: 1,
          endRecordIndex: 0,
        }),
      }),
    );
    expect(updateResponse.status).toBe(200);
    const updateBody = (await updateResponse.json()) as SegmentDetailResponse;
    expect(updateBody.segment).toMatchObject({
      id: createBody.segment.id,
      name: "Downtown edited segment",
      startRecordIndex: 0,
      endRecordIndex: 1,
    });
    expect(updateBody.efforts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ activityId: firstImported.importId, source: "source" }),
        expect.objectContaining({ activityId: secondImported.importId, source: "matched" }),
      ]),
    );

    const listResponse = await handler(new Request("http://ride-lens.test/api/segments"));
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as SegmentListResponse;
    expect(listBody.segments.map(({ segment }) => segment.id)).toContain(createBody.segment.id);
    expect(listBody.segments.map(({ segment }) => segment.name)).toContain(
      "Downtown edited segment",
    );

    const activitySegmentsResponse = await handler(
      new Request(`http://ride-lens.test/api/activities/${secondImported.importId}/segments`),
    );
    expect(activitySegmentsResponse.status).toBe(200);
    const activitySegmentsBody =
      (await activitySegmentsResponse.json()) as ActivitySegmentsResponse;
    expect(activitySegmentsBody.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          segment: expect.objectContaining({ id: createBody.segment.id }),
          effort: expect.objectContaining({ activityId: secondImported.importId }),
        }),
      ]),
    );

    const thirdForm = new FormData();
    thirdForm.append(
      "file",
      new Blob([
        makeRideFitFile({
          startTime: new Date("2026-01-15T13:20:00.000Z"),
          latitudeOffset: 0.00003,
          longitudeOffset: 0.00003,
        }),
      ]),
      "segment-later-match.fit",
    );
    const thirdImportResponse = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        body: thirdForm,
      }),
    );
    const thirdImported = (await thirdImportResponse.json()) as FitImportResponse;
    const laterActivitySegmentsResponse = await handler(
      new Request(`http://ride-lens.test/api/activities/${thirdImported.importId}/segments`),
    );
    expect(laterActivitySegmentsResponse.status).toBe(200);
    const laterActivitySegmentsBody =
      (await laterActivitySegmentsResponse.json()) as ActivitySegmentsResponse;
    expect(laterActivitySegmentsBody.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          segment: expect.objectContaining({ id: createBody.segment.id }),
          effort: expect.objectContaining({
            activityId: thirdImported.importId,
            source: "matched",
          }),
        }),
      ]),
    );
  });

  it("isolates activity data by authenticated Better Auth user", async () => {
    const form = new FormData();
    form.append("file", new Blob([makeRideFitFile()]), "secondary-rider.fit");

    const importResponse = await handler(
      new Request("http://ride-lens.test/api/activities/import", {
        method: "POST",
        headers: { cookie: SECONDARY_COOKIE },
        body: form,
      }),
    );
    expect(importResponse.status).toBe(200);

    const secondaryListResponse = await handler(
      new Request("http://ride-lens.test/api/activities", {
        headers: { cookie: SECONDARY_COOKIE },
      }),
    );
    const secondaryList = (await secondaryListResponse.json()) as ActivityListResponse;
    expect(secondaryList.activities.map((activity) => activity.filename)).toEqual([
      "secondary-rider.fit",
    ]);

    const primaryListResponse = await handler(
      new Request("http://ride-lens.test/api/activities", {
        headers: { cookie: PRIMARY_COOKIE },
      }),
    );
    const primaryList = (await primaryListResponse.json()) as ActivityListResponse;
    expect(
      primaryList.activities.some((activity) => activity.filename === "secondary-rider.fit"),
    ).toBe(false);
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
