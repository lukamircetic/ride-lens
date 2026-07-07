import { cn } from "@ride-lens/ui/lib/utils";

import { formatDeltaDistance, formatDeltaSpeed, formatDistance, formatSpeed } from "../formatters";
import type { SeasonSnapshotData } from "../season";

export function RecentComparison({ snapshot }: { readonly snapshot: SeasonSnapshotData }) {
  return (
    <div className="grid grid-cols-3 gap-px border border-ride-line bg-ride-line-soft max-[900px]:grid-cols-1">
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
    <div className="flex items-baseline justify-between gap-4 bg-ride-abyss px-4 py-3.5">
      <span className="font-ride text-[11px] font-semibold uppercase text-ride-ink-dim">{k}</span>
      <span className={cn("font-ride-mono text-[13px] text-ride-ink", up && "text-ride-amber")}>
        {v}
      </span>
    </div>
  );
}
