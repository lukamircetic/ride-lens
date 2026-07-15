import { classifyHeartRate } from "@ride-lens/heart-rate-zones";

import type { HeartRateZoneProfile } from "./types";

export const HEART_RATE_ZONE_COLORS = {
  1: "#78b7c8",
  2: "#52a675",
  3: "#d6c54a",
  4: "#f28c28",
  5: "#ff5a5f",
} as const;

export const BELOW_ZONE_COLOR = "#5c6572";
export const DIMMED_ZONE_COLOR = "#343a43";

export function heartRateZoneColor(zoneNumber: 1 | 2 | 3 | 4 | 5 | null): string {
  return zoneNumber === null ? BELOW_ZONE_COLOR : HEART_RATE_ZONE_COLORS[zoneNumber];
}

export function heartRateZoneNumber(
  heartRateBpm: number | null,
  profile: HeartRateZoneProfile | null,
): 1 | 2 | 3 | 4 | 5 | null {
  return heartRateBpm === null || profile === null
    ? null
    : classifyHeartRate(heartRateBpm, profile.zones);
}

export function formatHeartRateZoneRange(zone: HeartRateZoneProfile["zones"][number]): string {
  return zone.upperBpm === null
    ? `${zone.lowerBpm}+ bpm`
    : `${zone.lowerBpm}–${zone.upperBpm - 1} bpm`;
}

export function heartRateZoneMethodLabel(profile: HeartRateZoneProfile): string {
  if (profile.method === "heartRateReserve") return "Heart-rate reserve";
  if (profile.method === "custom") return "Custom BPM";
  return "% maximum HR";
}
