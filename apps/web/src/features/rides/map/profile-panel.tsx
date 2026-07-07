import { useMemo } from "react";

import type { ActivityRecord } from "../types";
import { buildProfileArea, buildProfilePath } from "./profile-path";

export function ProfilePanel({
  label,
  records,
  getValue,
  format: formatValue,
  fill,
  stroke,
  area,
}: {
  readonly label: string;
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly getValue: (record: ActivityRecord) => number | null;
  readonly format: (value: number) => string;
  readonly fill: string;
  readonly stroke: string;
  readonly area?: boolean;
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

  return (
    <div className="flex min-h-0 flex-col border-t border-ride-line p-4 first:border-t-0">
      <div className="flex items-baseline justify-between">
        <span className="font-ride text-[11px] font-bold uppercase text-ride-ink-dim">{label}</span>
        <b className="font-ride-mono text-[13px] text-ride-ink">
          {last === undefined ? "no data" : formatValue(last)}
        </b>
      </div>
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
      <div className="mt-1.5 flex justify-between font-ride-mono text-[10px] text-ride-ink-dim">
        <span>start</span>
        <span>peak {max === null ? "n/a" : formatValue(max)}</span>
      </div>
    </div>
  );
}
