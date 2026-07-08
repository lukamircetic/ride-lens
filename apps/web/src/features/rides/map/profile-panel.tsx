import NumberFlow, { type Format } from "@number-flow/react";
import { Liveline, type LivelinePoint } from "liveline";
import { useMemo } from "react";

import type { ActivityRecord } from "../types";
import { buildProfileArea, buildProfilePath } from "./profile-path";

interface LiveProfile {
  readonly data: ReadonlyArray<LivelinePoint>;
  readonly value: number | null;
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
        <div className="mt-2.5 h-full min-h-[150px] w-full flex-1">
          <Liveline
            badge={false}
            color={stroke}
            data={[...liveProfile.data]}
            emptyText=""
            exaggerate
            fill={area}
            formatValue={formatValue}
            grid={false}
            lineWidth={2}
            momentum={false}
            pulse={false}
            scrub={false}
            theme="dark"
            value={liveProfile.value ?? 0}
            window={liveProfile.windowSeconds}
          />
        </div>
      )}
      <div className="mt-1.5 flex justify-between font-ride-mono text-[10px] text-ride-ink-dim">
        <span>start</span>
        <span>peak {max === null ? "n/a" : formatValue(max)}</span>
      </div>
    </div>
  );
}
