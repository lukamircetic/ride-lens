import type { ActivityDetailResponse } from "@ride-lens/api";

import {
  formatBpm,
  formatCadence,
  formatDistance,
  formatDuration,
  formatRideTitle,
  formatSpeed,
  formatWatts,
  formatElevation,
} from "../formatters";
import { ProfilePanel } from "../map/profile-panel";
import { RouteMap } from "../map/route-map";
import type { ActivityListItem } from "../types";
import { MetricRow } from "./metric-row";

export function RideDetail({
  activity,
  detail,
  loading,
  error,
}: {
  readonly activity: ActivityListItem;
  readonly detail: ActivityDetailResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
}) {
  const records = detail?.records ?? [];

  return (
    <div>
      <div className="detail-head">
        <div>
          <div className="name">{formatRideTitle(activity)}</div>
          <div className="when">{activity.filename}</div>
        </div>
      </div>

      {error ? <div className="status error">{error}</div> : null}

      <div className="breakdown metrics">
        <MetricRow k="Distance" v={formatDistance(activity.summary.totalDistanceMeters)} />
        <MetricRow k="Average speed" v={formatSpeed(activity.summary.avgSpeedMetersPerSecond)} />
        <MetricRow k="Heart rate" v={formatBpm(activity.summary.avgHeartRateBpm)} />
        <MetricRow k="Climbing" v={`${formatElevation(activity.summary.totalAscentMeters)} m`} />
        <MetricRow k="Elapsed" v={formatDuration(activity.summary.totalElapsedSeconds)} />
        <MetricRow k="Timer" v={formatDuration(activity.summary.totalTimerSeconds)} />
        <MetricRow k="Cadence" v={formatCadence(activity.summary.avgCadenceRpm)} />
        <MetricRow k="Normalized pwr" v={formatWatts(activity.summary.normalizedPowerWatts)} />
      </div>

      <div className="map-grid ride-detail-map-grid">
        <RouteMap records={records} loading={loading} />
        <div className="map-profiles">
          <ProfilePanel
            label="Speed"
            records={records}
            getValue={(record) =>
              record.speedMetersPerSecond === null ? null : record.speedMetersPerSecond * 3.6
            }
            format={(value) => `${value.toFixed(1)} km/h`}
            fill="#ffc72c"
            stroke="#ffd95f"
          />
          <ProfilePanel
            label="Elevation"
            records={records}
            getValue={(record) => record.altitudeMeters}
            format={(value) => `${Math.round(value)} m`}
            fill="#ffc72c"
            stroke="#ffc72c"
            area
          />
          <ProfilePanel
            label="Heart rate"
            records={records}
            getValue={(record) => record.heartRateBpm}
            format={(value) => `${Math.round(value)} bpm`}
            fill="#9c7a12"
            stroke="#ff5a5f"
          />
        </div>
      </div>
    </div>
  );
}
