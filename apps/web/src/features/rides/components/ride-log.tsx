import { RIDE_LOG_PAGE_SIZE } from "../constants";
import { formatDistance, formatDuration, formatShortDate, formatSpeed } from "../formatters";
import type { ActivityListItem } from "../types";

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
    <div className="ride-log-panel">
      <div className="sec-head">
        <div className="sec-title">Ride log</div>
        <div className="ride-log-controls">
          <button
            type="button"
            className="ride-page-btn"
            disabled={page === 0}
            onClick={() => onPageChange((currentPage) => Math.max(0, currentPage - 1))}
            aria-label="Previous rides"
          >
            ‹
          </button>
          <div className="sec-sub">
            {loading ? "loading" : `${rideLogStartIndex}-${rideLogEndIndex} of ${activities.length}`}
          </div>
          <button
            type="button"
            className="ride-page-btn"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange((currentPage) => Math.min(pageCount - 1, currentPage + 1))}
            aria-label="Next rides"
          >
            ›
          </button>
        </div>
      </div>
      <div className="ride-table-frame">
        <table className="ride-table">
          <colgroup>
            <col className="ride-col-index" />
            <col />
            <col className="ride-col-distance" />
            <col className="ride-col-duration" />
            <col className="ride-col-speed" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th className="r">Dist</th>
              <th className="r">Time</th>
              <th className="r">Avg</th>
            </tr>
          </thead>
          <tbody>
            {visibleActivities.map((activity, index) => (
              <tr
                key={activity.id}
                className={[
                  selectedActivityId === activity.id ? "selected" : "",
                  hoveredActivityId === activity.id ? "hovered" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectActivity(activity.id)}
                onMouseEnter={() => onHoverActivity(activity.id)}
                onMouseLeave={() => onHoverActivity(null)}
              >
                <td>{String(page * RIDE_LOG_PAGE_SIZE + index + 1).padStart(2, "0")}</td>
                <td className="name">{formatShortDate(activity.summary.startTime)}</td>
                <td className="r amber">
                  {formatDistance(activity.summary.totalDistanceMeters)}
                </td>
                <td className="r">{formatDuration(activity.summary.totalMovingSeconds)}</td>
                <td className="r">{formatSpeed(activity.summary.avgSpeedMetersPerSecond)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
