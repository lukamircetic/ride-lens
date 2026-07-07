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
    () => records.map(getValue).filter((value): value is number => value !== null && Number.isFinite(value)),
    [records, getValue],
  );
  const last = values.at(-1);
  const max = values.length ? Math.max(...values) : null;
  const path = buildProfilePath(values, 600, 196, 184, 10);
  const areaPath = area ? buildProfileArea(values, 600, 196, 184, 10) : null;

  return (
    <div className="profile">
      <div className="pl">
        <span>{label}</span>
        <b>{last === undefined ? "no data" : formatValue(last)}</b>
      </div>
      <svg viewBox="0 0 600 196" role="img" aria-label={`${label} profile`}>
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
      <div className="paxis">
        <span>start</span>
        <span>peak {max === null ? "n/a" : formatValue(max)}</span>
      </div>
    </div>
  );
}
