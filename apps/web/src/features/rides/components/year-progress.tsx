import { useMemo } from "react";

import { MONTH_LABELS } from "../constants";
import { formatDistance, parseIsoDate } from "../formatters";
import type { ActivityListItem } from "../types";

export function YearProgress({
  activities,
}: {
  readonly activities: ReadonlyArray<ActivityListItem>;
}) {
  const months = useMemo(() => {
    const totals = Array.from({ length: 12 }, (_, month) => ({ month, distanceMeters: 0 }));

    for (const activity of activities) {
      const date = parseIsoDate(activity.summary.startTime);
      if (date) {
        totals[date.getMonth()]!.distanceMeters += activity.summary.totalDistanceMeters ?? 0;
      }
    }

    return totals;
  }, [activities]);
  const maxDistance = Math.max(1, ...months.map((month) => month.distanceMeters));

  return (
    <div className="relative border border-ride-line bg-ride-abyss p-3.5">
      <span
        className="absolute top-[-1px] left-[-1px] size-3.5 border border-r-0 border-b-0 border-ride-amber opacity-70"
        aria-hidden="true"
      />
      <span
        className="absolute top-[-1px] right-[-1px] size-3.5 border border-b-0 border-l-0 border-ride-amber opacity-70"
        aria-hidden="true"
      />
      <span
        className="absolute bottom-[-1px] left-[-1px] size-3.5 border border-t-0 border-r-0 border-ride-amber opacity-70"
        aria-hidden="true"
      />
      <span
        className="absolute right-[-1px] bottom-[-1px] size-3.5 border border-t-0 border-l-0 border-ride-amber opacity-70"
        aria-hidden="true"
      />
      <div className="grid grid-cols-12 gap-2.5 p-2 max-[900px]:grid-cols-6">
        {months.map((month) => {
          const height = Math.max(3, Math.round((month.distanceMeters / maxDistance) * 100));

          return (
            <div className="flex flex-col gap-[7px]" key={month.month}>
              <div className="flex h-[120px] items-end border border-ride-line-soft bg-ride-night-2 p-[5px]">
                <div
                  className="w-full bg-[repeating-linear-gradient(180deg,var(--amber)_0_9px,var(--night)_9px_11px)]"
                  style={{ height: `${height}%` }}
                  title={formatDistance(month.distanceMeters)}
                />
              </div>
              <div className="flex justify-between font-ride-mono text-[10px] text-ride-ink-dim">
                <span>{MONTH_LABELS[month.month]}</span>
                <b className="text-ride-ink">
                  {month.distanceMeters > 0
                    ? formatDistance(month.distanceMeters).replace(" km", "")
                    : "—"}
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
