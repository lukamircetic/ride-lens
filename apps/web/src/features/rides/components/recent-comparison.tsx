import { formatDeltaDistance, formatDeltaSpeed, formatDistance, formatSpeed } from "../formatters";
import type { SeasonSnapshotData } from "../season";

export function RecentComparison({ snapshot }: { readonly snapshot: SeasonSnapshotData }) {
  return (
    <div className="delta-panel">
      <Delta k="Recent distance" v={formatDistance(snapshot.recentDistanceMeters)} />
      <Delta
        k="Previous distance"
        v={
          snapshot.previousDistanceMeters === null
            ? "n/a"
            : formatDistance(snapshot.previousDistanceMeters)
        }
      />
      <Delta
        k="Distance delta"
        v={formatDeltaDistance(snapshot.distanceDeltaMeters)}
        up={snapshot.distanceDeltaMeters !== null && snapshot.distanceDeltaMeters > 0}
      />
      <Delta k="Recent average" v={formatSpeed(snapshot.recentAvgSpeedMetersPerSecond)} />
      <Delta
        k="Previous average"
        v={
          snapshot.previousAvgSpeedMetersPerSecond === null
            ? "n/a"
            : formatSpeed(snapshot.previousAvgSpeedMetersPerSecond)
        }
      />
      <Delta
        k="Speed delta"
        v={formatDeltaSpeed(snapshot.speedDeltaMetersPerSecond)}
        up={snapshot.speedDeltaMetersPerSecond !== null && snapshot.speedDeltaMetersPerSecond > 0}
      />
    </div>
  );
}

function Delta({ k, v, up }: { readonly k: string; readonly v: string; readonly up?: boolean }) {
  return (
    <div className="drow">
      <span className="k">{k}</span>
      <span className={`v${up ? " up" : ""}`}>{v}</span>
    </div>
  );
}
