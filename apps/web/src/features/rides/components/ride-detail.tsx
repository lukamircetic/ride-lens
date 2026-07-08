import type { ActivityDetailResponse } from "@ride-lens/api";
import { cn } from "@ride-lens/ui/lib/utils";

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
import type { ActivityListItem, ActivitySegment } from "../types";
import { MetricRow } from "./metric-row";
import { WeatherContext } from "./weather-context";

export function RideDetail({
  activity,
  detail,
  loading,
  error,
  segments,
  creatingSegment,
  segmentError,
  onCreateSegment,
  onUpdateSegment,
}: {
  readonly activity: ActivityListItem;
  readonly detail: ActivityDetailResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly segments: ReadonlyArray<ActivitySegment>;
  readonly creatingSegment: boolean;
  readonly segmentError: string | null;
  readonly onCreateSegment: (payload: {
    readonly name: string;
    readonly startRecordIndex: number;
    readonly endRecordIndex: number;
  }) => Promise<void>;
  readonly onUpdateSegment: (
    segmentId: string,
    payload: {
      readonly name: string;
      readonly startRecordIndex: number;
      readonly endRecordIndex: number;
    },
  ) => Promise<void>;
}) {
  const records = detail?.records ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="font-ride text-[22px] leading-[1.1] font-extrabold uppercase">
            {formatRideTitle(activity)}
          </div>
          <div className="min-w-0 font-ride-mono text-xs text-ride-ink-dim [overflow-wrap:anywhere]">
            {activity.filename}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-[18px] border border-ride-line border-l-[3px] border-l-ride-danger px-3.5 py-3 text-sm text-[#e6a59d]">
          {error}
        </div>
      ) : null}

      <section>
        <div className="mb-2.5 flex items-center justify-between gap-3 font-ride text-[11px] font-bold uppercase text-ride-ink-dim">
          <span className="inline-flex items-center text-ride-ink-muted">Ride Stats</span>
        </div>
        <div className="mt-0 grid grid-cols-4 gap-px border border-ride-line bg-ride-line-soft max-[900px]:grid-cols-2">
          <MetricRow k="Distance" v={formatDistance(activity.summary.totalDistanceMeters)} />
          <MetricRow k="Average speed" v={formatSpeed(activity.summary.avgSpeedMetersPerSecond)} />
          <MetricRow k="Heart rate" v={formatBpm(activity.summary.avgHeartRateBpm)} />
          <MetricRow k="Climbing" v={`${formatElevation(activity.summary.totalAscentMeters)} m`} />
          <MetricRow k="Elapsed" v={formatDuration(activity.summary.totalElapsedSeconds)} />
          <MetricRow k="Timer" v={formatDuration(activity.summary.totalTimerSeconds)} />
          <MetricRow k="Cadence" v={formatCadence(activity.summary.avgCadenceRpm)} />
          <MetricRow k="Normalized pwr" v={formatWatts(activity.summary.normalizedPowerWatts)} />
        </div>
      </section>

      <WeatherContext weather={detail?.weather ?? null} />

      <div className="mt-3.5 grid grid-cols-[1.4fr_0.6fr] gap-0 border border-ride-line bg-ride-abyss max-[900px]:grid-cols-1">
        <RouteMap
          records={records}
          loading={loading}
          segments={segments}
          weather={detail?.weather ?? null}
          creatingSegment={creatingSegment}
          segmentError={segmentError}
          onCreateSegment={onCreateSegment}
          onUpdateSegment={onUpdateSegment}
        />
        <div
          className={cn(
            "grid min-w-0 grid-rows-3 border-l border-ride-line bg-ride-abyss",
            "max-[900px]:grid-rows-none max-[900px]:border-l-0 max-[900px]:border-t",
          )}
        >
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
