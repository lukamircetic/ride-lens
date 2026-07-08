import NumberFlow, { type Format } from "@number-flow/react";
import { useMemo } from "react";

import type { ActivityRecord } from "../types";
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
  readonly numberFlow?: {
    readonly format: Format;
    readonly suffix: string;
  };
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
}: {
  readonly label: string;
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly getValue: (record: ActivityRecord) => number | null;
  readonly format: (value: number) => string;
  readonly fill: string;
  readonly stroke: string;
  readonly area?: boolean;
  readonly liveProfile?: LiveProfile;
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
  const path = buildProfilePath(values, 600, 196, 184, 10);
  const areaPath = area ? buildProfileArea(values, 600, 196, 184, 10) : null;
  const displayedValue = liveProfile === undefined ? last : liveProfile.value;
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
        )
      : null;

  return (
    <div className="flex min-h-0 flex-col border-t border-ride-line p-4 first:border-t-0">
      <div className="flex items-baseline justify-between">
        <span className="font-ride text-[11px] font-bold uppercase text-ride-ink-dim">{label}</span>
        <b className="font-ride-mono text-[13px] text-ride-ink">
          {displayedValue === undefined || displayedValue === null ? (
            "no data"
          ) : liveProfile?.numberFlow === undefined ? (
            formatValue(displayedValue)
          ) : (
            <NumberFlow
              value={displayedValue}
              format={liveProfile.numberFlow.format}
              suffix={liveProfile.numberFlow.suffix}
            />
          )}
        </b>
      </div>
      {liveProfile === undefined ? (
        <svg
          className="mt-2.5 block h-full min-h-0 w-full flex-1"
          viewBox="0 0 600 196"
          role="img"
          aria-label={`${label} profile`}
        >
          <line x1="0" y1="184" x2="600" y2="184" stroke="var(--line)" strokeWidth="1" />
          {areaPath ? <path d={areaPath} fill={fill} fillOpacity="0.18" /> : null}
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
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
          <line x1="0" y1="184" x2="600" y2="184" stroke="var(--line)" strokeWidth="1" />
          {liveAreaPath ? <path d={liveAreaPath} fill={fill} fillOpacity="0.18" /> : null}
          {livePath ? (
            <path
              d={livePath}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
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
): string | null {
  const points = liveProfilePlotPoints(
    data,
    currentTimeSeconds,
    windowSeconds,
    width,
    baseline,
    top,
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
): string | null {
  const points = liveProfilePlotPoints(
    data,
    currentTimeSeconds,
    windowSeconds,
    width,
    baseline,
    top,
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
): ReadonlyArray<LiveProfilePlotPoint> {
  const visible = liveProfileWindow(data, currentTimeSeconds, windowSeconds);
  if (visible.length < 2) return [];

  const values = visible.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
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
