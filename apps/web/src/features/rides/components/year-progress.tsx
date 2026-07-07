import { useMemo } from "react";

import { MONTH_LABELS } from "../constants";
import { formatDistance, parseIsoDate } from "../formatters";
import type { ActivityListItem } from "../types";

export function YearProgress({ activities }: { readonly activities: ReadonlyArray<ActivityListItem> }) {
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
    <div className="chart">
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      <div className="months months-inset">
        {months.map((month) => {
          const height = Math.max(3, Math.round((month.distanceMeters / maxDistance) * 100));

          return (
            <div className="month" key={month.month}>
              <div className="track">
                <div
                  className="bar"
                  style={{ height: `${height}%` }}
                  title={formatDistance(month.distanceMeters)}
                />
              </div>
              <div className="ml">
                <span>{MONTH_LABELS[month.month]}</span>
                <b>
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
