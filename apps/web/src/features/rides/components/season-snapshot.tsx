import {
  formatDate,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
} from "../formatters";
import type { SeasonSnapshotData, SeasonTotals } from "../season";
import { GantryRow, Sign } from "./stat-sign";

export function SeasonSnapshot({
  snapshot,
  totals,
  onSelect,
}: {
  readonly snapshot: SeasonSnapshotData;
  readonly totals: SeasonTotals;
  readonly onSelect: (activityId: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(240px,0.68fr)_1fr] items-stretch gap-3.5 max-[900px]:grid-cols-1">
      <div
        className="mt-0 flex min-h-full flex-col overflow-hidden rounded-lg border-[3px] border-white bg-ride-sign text-white shadow-[0_0_0_4px_var(--sign-green-edge),0_14px_32px_rgb(0_0_0_/_0.34)]"
        role="group"
        aria-label="Season totals"
      >
        <GantryRow label="Rides logged" value={String(totals.rideCount)} />
        <GantryRow label="Total distance" value={formatDistance(totals.distanceMeters)} />
        <GantryRow label="Moving time" value={formatDuration(totals.movingSeconds)} />
        <GantryRow label="Elevation gained" value={formatElevation(totals.ascentMeters)} unit="m" />
      </div>
      <div className="grid grid-cols-2 gap-px border border-ride-line bg-ride-line-soft">
        <Sign
          label="Longest ride"
          value={
            snapshot.longestRide
              ? formatDistance(snapshot.longestRide.summary.totalDistanceMeters)
              : "n/a"
          }
          cap={
            snapshot.longestRide ? formatDate(snapshot.longestRide.summary.startTime) : undefined
          }
          accent
          onClick={snapshot.longestRide ? () => onSelect(snapshot.longestRide!.id) : undefined}
        />
        <Sign
          label="Fastest average"
          value={
            snapshot.fastestRide
              ? formatSpeed(snapshot.fastestRide.summary.avgSpeedMetersPerSecond)
              : "n/a"
          }
          cap={
            snapshot.fastestRide
              ? formatDistance(snapshot.fastestRide.summary.totalDistanceMeters)
              : undefined
          }
          accent
          onClick={snapshot.fastestRide ? () => onSelect(snapshot.fastestRide!.id) : undefined}
        />
        <Sign
          label="Most climbing"
          value={
            snapshot.biggestClimb
              ? formatElevation(snapshot.biggestClimb.summary.totalAscentMeters)
              : "n/a"
          }
          cap={
            snapshot.biggestClimb ? formatDate(snapshot.biggestClimb.summary.startTime) : undefined
          }
          accent
          onClick={snapshot.biggestClimb ? () => onSelect(snapshot.biggestClimb!.id) : undefined}
        />
        <Sign
          label="Latest ride"
          value={
            snapshot.latestRide
              ? formatDistance(snapshot.latestRide.summary.totalDistanceMeters)
              : "n/a"
          }
          cap={
            snapshot.latestRide ? formatDateTime(snapshot.latestRide.summary.startTime) : undefined
          }
          accent
          onClick={snapshot.latestRide ? () => onSelect(snapshot.latestRide!.id) : undefined}
        />
      </div>
    </div>
  );
}
