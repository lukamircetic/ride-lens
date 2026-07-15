import { useMemo } from "react";

import type { ActivityRecord, HeartRateZoneProfile } from "../../types";
import {
  heartRateZoneColor,
  heartRateZoneNumber,
  HEART_RATE_ZONE_COLORS,
} from "../../heart-rate-zones";
import { buildProfileArea, buildProfilePath } from "./profile-path";

interface LiveProfilePoint {
  readonly time: number;
  readonly value: number;
}

interface LiveProfilePlotPoint {
  readonly x: number;
  readonly y: number;
}

interface LiveProfile {
  readonly data: ReadonlyArray<LiveProfilePoint>;
  readonly value: number | null;
  readonly currentTimeSeconds: number;
  readonly windowSeconds: number;
}

export function ProfilePanel({
  label,
  records,
  getValue,
  format: formatValue,
  fill,
  stroke,
  area,
  liveProfile,
  heartRateZoneProfile,
  selectedHeartRateZone,
}: {
  readonly label: string;
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly getValue: (record: ActivityRecord) => number | null;
  readonly format: (value: number) => string;
  readonly fill: string;
  readonly stroke: string;
  readonly area?: boolean;
  readonly liveProfile?: LiveProfile;
  readonly heartRateZoneProfile?: HeartRateZoneProfile;
  readonly selectedHeartRateZone?: 1 | 2 | 3 | 4 | 5 | null;
}) {
  const values = useMemo(
    () =>
      records
        .map(getValue)
        .filter((value): value is number => value !== null && Number.isFinite(value)),
    [records, getValue],
  );
  const last = values.at(-1);
  const max = values.length ? Math.max(...values) : null;
  const chartDomain = heartRateZoneProfile
    ? heartRateChartDomain(values, heartRateZoneProfile)
    : undefined;
  const path = buildProfilePath(values, 600, 196, 184, 10, chartDomain);
  const areaPath = area ? buildProfileArea(values, 600, 196, 184, 10, chartDomain) : null;
  const displayedValue = liveProfile === undefined ? last : liveProfile.value;
  const displayedZone = heartRateZoneNumber(displayedValue ?? null, heartRateZoneProfile ?? null);
  const selectedZoneClip =
    heartRateZoneProfile && chartDomain && selectedHeartRateZone
      ? heartRateZoneBandRect(heartRateZoneProfile.zones[selectedHeartRateZone - 1]!, chartDomain)
      : null;
  const livePath =
    liveProfile === undefined
      ? null
      : buildLiveProfilePath(
          liveProfile.data,
          liveProfile.currentTimeSeconds,
          liveProfile.windowSeconds,
          600,
          184,
          10,
          chartDomain,
        );
  const liveAreaPath =
    area && liveProfile !== undefined
      ? buildLiveProfileArea(
          liveProfile.data,
          liveProfile.currentTimeSeconds,
          liveProfile.windowSeconds,
          600,
          184,
          10,
          chartDomain,
        )
      : null;

  return (
    <div className="flex min-h-0 flex-col border-t border-ride-line p-4 first:border-t-0">
      <div className="flex items-baseline justify-between">
        <span className="font-ride text-[11px] font-bold uppercase text-ride-ink-dim">{label}</span>
        <b className="font-ride-mono text-[13px] text-ride-ink">
          {displayedValue === undefined || displayedValue === null
            ? "no data"
            : `${formatValue(displayedValue)}${displayedZone === null ? "" : ` · Z${displayedZone}`}`}
        </b>
      </div>
      {liveProfile === undefined ? (
        <svg
          className="mt-2.5 block h-full min-h-0 w-full flex-1"
          viewBox="0 0 600 196"
          role="img"
          aria-label={`${label} profile`}
        >
          {heartRateZoneProfile && chartDomain ? (
            <HeartRateZoneBands
              profile={heartRateZoneProfile}
              domain={chartDomain}
              selectedZone={selectedHeartRateZone ?? null}
            />
          ) : null}
          {selectedZoneClip ? (
            <defs>
              <clipPath id="selected-heart-rate-zone">
                <rect x="0" y={selectedZoneClip.top} width="600" height={selectedZoneClip.height} />
              </clipPath>
            </defs>
          ) : null}
          <line x1="0" y1="184" x2="600" y2="184" stroke="var(--line)" strokeWidth="1" />
          {areaPath ? <path d={areaPath} fill={fill} fillOpacity="0.18" /> : null}
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={stroke}
              opacity={selectedHeartRateZone ? 0.22 : 1}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {path && selectedHeartRateZone && selectedZoneClip ? (
            <path
              d={path}
              fill="none"
              stroke={heartRateZoneColor(selectedHeartRateZone)}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath="url(#selected-heart-rate-zone)"
            />
          ) : null}
        </svg>
      ) : (
        <svg
          className="mt-2.5 block h-full min-h-0 w-full flex-1"
          viewBox="0 0 600 196"
          role="img"
          aria-label={`${label} replay profile`}
        >
          {heartRateZoneProfile && chartDomain ? (
            <HeartRateZoneBands
              profile={heartRateZoneProfile}
              domain={chartDomain}
              selectedZone={selectedHeartRateZone ?? null}
            />
          ) : null}
          {selectedZoneClip ? (
            <defs>
              <clipPath id="selected-heart-rate-zone-replay">
                <rect x="0" y={selectedZoneClip.top} width="600" height={selectedZoneClip.height} />
              </clipPath>
            </defs>
          ) : null}
          <line x1="0" y1="184" x2="600" y2="184" stroke="var(--line)" strokeWidth="1" />
          {liveAreaPath ? <path d={liveAreaPath} fill={fill} fillOpacity="0.18" /> : null}
          {livePath ? (
            <path
              d={livePath}
              fill="none"
              stroke={stroke}
              opacity={selectedHeartRateZone ? 0.22 : 1}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {livePath && selectedHeartRateZone && selectedZoneClip ? (
            <path
              d={livePath}
              fill="none"
              stroke={heartRateZoneColor(selectedHeartRateZone)}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath="url(#selected-heart-rate-zone-replay)"
            />
          ) : null}
        </svg>
      )}
      <div className="mt-1.5 flex justify-between font-ride-mono text-[10px] text-ride-ink-dim">
        <span>start</span>
        <span>peak {max === null ? "n/a" : formatValue(max)}</span>
      </div>
    </div>
  );
}

function buildLiveProfilePath(
  data: ReadonlyArray<LiveProfilePoint>,
  currentTimeSeconds: number,
  windowSeconds: number,
  width: number,
  baseline: number,
  top: number,
  domain?: { readonly min: number; readonly max: number },
): string | null {
  const points = liveProfilePlotPoints(
    data,
    currentTimeSeconds,
    windowSeconds,
    width,
    baseline,
    top,
    domain,
  );
  return points.length < 2 ? null : liveProfilePathFromPoints(points);
}

function buildLiveProfileArea(
  data: ReadonlyArray<LiveProfilePoint>,
  currentTimeSeconds: number,
  windowSeconds: number,
  width: number,
  baseline: number,
  top: number,
  domain?: { readonly min: number; readonly max: number },
): string | null {
  const points = liveProfilePlotPoints(
    data,
    currentTimeSeconds,
    windowSeconds,
    width,
    baseline,
    top,
    domain,
  );
  if (points.length < 2) return null;

  const line = liveProfilePathFromPoints(points);
  const first = points[0]!;
  const last = points.at(-1)!;
  return `${line} L${last.x.toFixed(2)} ${baseline} L${first.x.toFixed(2)} ${baseline} Z`;
}

function liveProfilePlotPoints(
  data: ReadonlyArray<LiveProfilePoint>,
  currentTimeSeconds: number,
  windowSeconds: number,
  width: number,
  baseline: number,
  top: number,
  domain?: { readonly min: number; readonly max: number },
): ReadonlyArray<LiveProfilePlotPoint> {
  const visible = liveProfileWindow(data, currentTimeSeconds, windowSeconds);
  if (visible.length < 2) return [];

  const values = visible.map((point) => point.value);
  const min = domain?.min ?? Math.min(...values);
  const max = domain?.max ?? Math.max(...values);
  const range = Math.max(max - min, 0.00001);
  const startTime = Math.max(0, currentTimeSeconds - windowSeconds);
  const visibleWindow = Math.max(windowSeconds, 0.00001);
  const span = baseline - top;

  return visible.map((point) => ({
    x: clamp(((point.time - startTime) / visibleWindow) * width, 0, width),
    y: baseline - ((point.value - min) / range) * span,
  }));
}

function liveProfilePathFromPoints(points: ReadonlyArray<LiveProfilePlotPoint>): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function liveProfileWindow(
  data: ReadonlyArray<LiveProfilePoint>,
  currentTimeSeconds: number,
  windowSeconds: number,
): ReadonlyArray<LiveProfilePoint> {
  const startTime = Math.max(0, currentTimeSeconds - windowSeconds);
  return data.filter((point) => point.time >= startTime && point.time <= currentTimeSeconds);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function heartRateChartDomain(
  values: ReadonlyArray<number>,
  profile: HeartRateZoneProfile,
): { readonly min: number; readonly max: number } {
  const observedMinimum = values.length > 0 ? Math.min(...values) : profile.zones[0]!.lowerBpm;
  const observedMaximum = values.length > 0 ? Math.max(...values) : profile.zones[4]!.lowerBpm;
  const lower = Math.min(observedMinimum, profile.zones[0]!.lowerBpm);
  const configuredMaximum = profile.maximumHeartRateBpm ?? profile.zones[4]!.lowerBpm + 20;
  return {
    min: lower,
    max: Math.max(observedMaximum, configuredMaximum, lower + 1),
  };
}

function HeartRateZoneBands({
  profile,
  domain,
  selectedZone,
}: {
  readonly profile: HeartRateZoneProfile;
  readonly domain: { readonly min: number; readonly max: number };
  readonly selectedZone: 1 | 2 | 3 | 4 | 5 | null;
}) {
  return profile.zones.map((zone) => {
    const band = heartRateZoneBandRect(zone, domain);
    return (
      <rect
        key={zone.number}
        x="0"
        y={band.top}
        width="600"
        height={band.height}
        fill={HEART_RATE_ZONE_COLORS[zone.number]}
        opacity={selectedZone === null ? 0.09 : selectedZone === zone.number ? 0.22 : 0.025}
      />
    );
  });
}

function heartRateZoneBandRect(
  zone: HeartRateZoneProfile["zones"][number],
  domain: { readonly min: number; readonly max: number },
): { readonly top: number; readonly height: number } {
  const chartTop = 10;
  const chartBottom = 184;
  const chartHeight = chartBottom - chartTop;
  const yForHeartRate = (heartRate: number) =>
    chartBottom -
    ((clamp(heartRate, domain.min, domain.max) - domain.min) / (domain.max - domain.min)) *
      chartHeight;
  const top = yForHeartRate(zone.upperBpm ?? domain.max);
  const bottom = yForHeartRate(zone.lowerBpm);
  return { top, height: Math.max(0, bottom - top) };
}
