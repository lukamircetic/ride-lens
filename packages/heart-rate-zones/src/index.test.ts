import { describe, expect, it } from "vitest";

import {
  calculateHeartRateZoneDistribution,
  classifyHeartRate,
  combineHeartRateZoneDistributions,
  estimateMaximumHeartRate,
  resolveHeartRateZones,
} from "./index";

describe("heart-rate zone profile", () => {
  it("resolves the standard five zones from maximum heart rate", () => {
    const zones = resolveHeartRateZones({
      method: "percentMax",
      maximumHeartRateBpm: 190,
      restingHeartRateBpm: null,
      customLowerBoundsBpm: null,
    });

    expect(zones.map(({ lowerBpm, upperBpm }) => [lowerBpm, upperBpm])).toEqual([
      [95, 114],
      [114, 133],
      [133, 152],
      [152, 171],
      [171, null],
    ]);
  });

  it("resolves zones from heart-rate reserve", () => {
    const zones = resolveHeartRateZones({
      method: "heartRateReserve",
      maximumHeartRateBpm: 190,
      restingHeartRateBpm: 50,
      customLowerBoundsBpm: null,
    });

    expect(zones.map(({ lowerBpm }) => lowerBpm)).toEqual([120, 134, 148, 162, 176]);
  });

  it("uses lower-inclusive boundaries and keeps sub-zone effort separate", () => {
    const zones = resolveHeartRateZones({
      method: "custom",
      maximumHeartRateBpm: null,
      restingHeartRateBpm: null,
      customLowerBoundsBpm: [100, 120, 140, 160, 180],
    });

    expect(classifyHeartRate(99, zones)).toBe(null);
    expect(classifyHeartRate(100, zones)).toBe(1);
    expect(classifyHeartRate(139, zones)).toBe(2);
    expect(classifyHeartRate(180, zones)).toBe(5);
    expect(classifyHeartRate(240, zones)).toBe(5);
  });

  it("estimates maximum heart rate without treating the result as a measurement", () => {
    expect(estimateMaximumHeartRate(40)).toBe(180);
  });
});

describe("time in heart-rate zones", () => {
  const zones = resolveHeartRateZones({
    method: "custom",
    maximumHeartRateBpm: null,
    restingHeartRateBpm: null,
    customLowerBoundsBpm: [100, 120, 140, 160, 180],
  });

  it("splits an interval at a crossed zone boundary", () => {
    const distribution = calculateHeartRateZoneDistribution(
      [
        { timestampMs: 0, heartRateBpm: 110 },
        { timestampMs: 20_000, heartRateBpm: 130 },
      ],
      zones,
      20,
    );

    expect(distribution.classifiedSeconds).toBeCloseTo(20);
    expect(distribution.coverageRatio).toBeCloseTo(1);
    expect(distribution.zones[0]?.seconds).toBeCloseTo(10);
    expect(distribution.zones[1]?.seconds).toBeCloseTo(10);
  });

  it("reports valid samples below zone one instead of folding them into recovery", () => {
    const distribution = calculateHeartRateZoneDistribution(
      [
        { timestampMs: 0, heartRateBpm: 90 },
        { timestampMs: 10_000, heartRateBpm: 90 },
      ],
      zones,
      10,
    );

    expect(distribution.belowZoneSeconds).toBeCloseTo(10);
    expect(distribution.classifiedSeconds).toBeCloseTo(10);
    expect(distribution.zones.every(({ seconds }) => seconds === 0)).toBe(true);
  });

  it("does not attribute long recording gaps to a zone", () => {
    const distribution = calculateHeartRateZoneDistribution(
      [
        { timestampMs: 0, heartRateBpm: 110 },
        { timestampMs: 10_000, heartRateBpm: 110 },
        { timestampMs: 50_000, heartRateBpm: 130 },
      ],
      zones,
      50,
    );

    expect(distribution.classifiedSeconds).toBeCloseTo(10);
    expect(distribution.coverageRatio).toBeCloseTo(0.2);
    expect(distribution.unclassifiedSeconds).toBeCloseTo(40);
  });

  it("does not bridge intervals with missing heart-rate samples", () => {
    const distribution = calculateHeartRateZoneDistribution(
      [
        { timestampMs: 0, heartRateBpm: 110 },
        { timestampMs: 10_000, heartRateBpm: null },
        { timestampMs: 20_000, heartRateBpm: 130 },
      ],
      zones,
      20,
    );

    expect(distribution.classifiedSeconds).toBe(0);
    expect(distribution.coverageRatio).toBe(0);
    expect(distribution.unclassifiedSeconds).toBe(20);
  });

  it("combines ride distributions without changing coverage or zone semantics", () => {
    const first = calculateHeartRateZoneDistribution(
      [
        { timestampMs: 0, heartRateBpm: 90 },
        { timestampMs: 10_000, heartRateBpm: 110 },
      ],
      zones,
      20,
    );
    const second = calculateHeartRateZoneDistribution(
      [
        { timestampMs: 0, heartRateBpm: 130 },
        { timestampMs: 10_000, heartRateBpm: 130 },
      ],
      zones,
      10,
    );

    const combined = combineHeartRateZoneDistributions([first, second], zones);

    expect(combined.totalTimerSeconds).toBe(30);
    expect(combined.classifiedSeconds).toBe(20);
    expect(combined.unclassifiedSeconds).toBe(10);
    expect(combined.coverageRatio).toBeCloseTo(2 / 3);
    expect(combined.belowZoneSeconds).toBeCloseTo(5);
    expect(combined.zones[0]?.seconds).toBeCloseTo(5);
    expect(combined.zones[1]?.seconds).toBeCloseTo(10);
  });
});
