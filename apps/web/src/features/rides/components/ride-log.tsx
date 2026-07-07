import { cn } from "@ride-lens/ui/lib/utils";

import { RIDE_LOG_PAGE_SIZE } from "../constants";
import { formatDistance, formatDuration, formatShortDate, formatSpeed } from "../formatters";
import type { ActivityListItem } from "../types";

const sectionHeaderClassName = "mb-3 flex flex-wrap items-baseline justify-between gap-5";

const sectionTitleClassName = "font-ride text-[13px] font-bold uppercase text-ride-ink-muted";

const sectionSubClassName = "font-ride text-[11px] text-ride-ink-dim";

const pageButtonClassName =
  "grid size-7 cursor-pointer place-items-center border border-ride-line bg-ride-night-2 font-ride-mono text-[13px] text-ride-ink-muted hover:border-ride-amber hover:text-ride-amber disabled:cursor-default disabled:border-ride-line disabled:text-ride-ink-dim disabled:opacity-[0.38]";

const headerCellClassName =
  "h-9 border-b border-ride-line px-[9px] text-left font-ride text-[11px] font-semibold uppercase text-ride-ink-dim";

const dataCellClassName =
  "h-[42px] whitespace-nowrap border-b border-ride-line-soft px-[9px] text-ride-ink-muted";

export function RideLog({
  activities,
  selectedActivityId,
  hoveredActivityId,
  loading,
  page,
  pageCount,
  onPageChange,
  onSelectActivity,
  onHoverActivity,
}: {
  readonly activities: ReadonlyArray<ActivityListItem>;
  readonly selectedActivityId: string | null;
  readonly hoveredActivityId: string | null;
  readonly loading: boolean;
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number | ((current: number) => number)) => void;
  readonly onSelectActivity: (activityId: string) => void;
  readonly onHoverActivity: (activityId: string | null) => void;
}) {
  const rideLogStartIndex = activities.length === 0 ? 0 : page * RIDE_LOG_PAGE_SIZE + 1;
  const rideLogEndIndex = Math.min(activities.length, (page + 1) * RIDE_LOG_PAGE_SIZE);
  const visibleActivities = activities.slice(
    page * RIDE_LOG_PAGE_SIZE,
    (page + 1) * RIDE_LOG_PAGE_SIZE,
  );

  return (
    <div className="flex min-w-0 flex-col">
      <div className={sectionHeaderClassName}>
        <div className={sectionTitleClassName}>Ride log</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={pageButtonClassName}
            disabled={page === 0}
            onClick={() => onPageChange((currentPage) => Math.max(0, currentPage - 1))}
            aria-label="Previous rides"
          >
            ‹
          </button>
          <div className={sectionSubClassName}>
            {loading
              ? "loading"
              : `${rideLogStartIndex}-${rideLogEndIndex} of ${activities.length}`}
          </div>
          <button
            type="button"
            className={pageButtonClassName}
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange((currentPage) => Math.min(pageCount - 1, currentPage + 1))}
            aria-label="Next rides"
          >
            ›
          </button>
        </div>
      </div>
      <div className="h-[456px]">
        <table className="w-full table-fixed border-collapse font-ride-mono text-[13px]">
          <colgroup>
            <col className="w-[42px]" />
            <col />
            <col className="w-[94px]" />
            <col className="w-[86px]" />
            <col className="w-24" />
          </colgroup>
          <thead>
            <tr>
              <th className={headerCellClassName}>#</th>
              <th className={headerCellClassName}>Date</th>
              <th className={cn(headerCellClassName, "text-right")}>Dist</th>
              <th className={cn(headerCellClassName, "text-right")}>Time</th>
              <th className={cn(headerCellClassName, "text-right")}>Avg</th>
            </tr>
          </thead>
          <tbody>
            {visibleActivities.map((activity, index) => (
              <tr
                key={activity.id}
                className={cn(
                  "cursor-pointer transition-colors hover:[&>td]:bg-[rgb(255_199_44_/_0.06)]",
                  selectedActivityId === activity.id &&
                    "[&>td]:border-b-transparent [&>td]:bg-[rgb(255_199_44_/_0.1)]",
                  hoveredActivityId === activity.id &&
                    "[&>td]:border-b-transparent [&>td]:bg-[rgb(120_183_200_/_0.08)]",
                )}
                onClick={() => onSelectActivity(activity.id)}
                onMouseEnter={() => onHoverActivity(activity.id)}
                onMouseLeave={() => onHoverActivity(null)}
              >
                <td className={dataCellClassName}>
                  {String(page * RIDE_LOG_PAGE_SIZE + index + 1).padStart(2, "0")}
                </td>
                <td className={cn(dataCellClassName, "leading-[1.35] text-ride-ink")}>
                  {formatShortDate(activity.summary.startTime)}
                </td>
                <td className={cn(dataCellClassName, "text-right text-ride-amber-bright")}>
                  {formatDistance(activity.summary.totalDistanceMeters)}
                </td>
                <td className={cn(dataCellClassName, "text-right")}>
                  {formatDuration(activity.summary.totalMovingSeconds)}
                </td>
                <td className={cn(dataCellClassName, "text-right")}>
                  {formatSpeed(activity.summary.avgSpeedMetersPerSecond)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
