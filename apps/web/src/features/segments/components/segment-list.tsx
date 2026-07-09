import { Button } from "@ride-lens/ui/components/button";
import { cn } from "@ride-lens/ui/lib/utils";

import { formatDistance, formatDuration, formatShortDate } from "../../rides/formatters";
import type { SegmentWithEfforts } from "../../rides/types";
import { bestEffort, latestEffort } from "../segment-efforts";
import {
  sectionHeaderClassName,
  sectionSubClassName,
  sectionTitleClassName,
} from "../segment-styles";
import { MiniCell } from "./segment-cells";

export function SegmentList({
  segments,
  selectedSegmentId,
  loading,
  onSelect,
}: {
  readonly segments: ReadonlyArray<SegmentWithEfforts>;
  readonly selectedSegmentId: string | null;
  readonly loading: boolean;
  readonly onSelect: (segmentId: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className={sectionHeaderClassName}>
        <div className={sectionTitleClassName}>Saved segments</div>
        <div className={sectionSubClassName}>
          {loading ? "loading" : `${segments.length} total`}
        </div>
      </div>
      <div className="border border-ride-line bg-ride-abyss">
        {segments.map((item) => {
          const best = bestEffort(item.efforts);
          const latest = latestEffort(item.efforts);
          return (
            <Button
              key={item.segment.id}
              type="button"
              variant="unstyled"
              className={cn(
                "block w-full border-b border-ride-line-soft px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-[rgb(255_199_44_/_0.06)]",
                selectedSegmentId === item.segment.id && "bg-[rgb(255_199_44_/_0.1)]",
              )}
              onClick={() => onSelect(item.segment.id)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 truncate font-ride text-[13px] font-bold uppercase text-ride-ink">
                  {item.segment.name}
                </div>
                <div className="shrink-0 font-ride-mono text-[11px] text-ride-amber-bright">
                  {item.efforts.length} {item.efforts.length === 1 ? "effort" : "efforts"}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-px border border-ride-line-soft bg-ride-line-soft">
                <MiniCell label="Best" value={formatDuration(best?.stats.elapsedSeconds ?? null)} />
                <MiniCell
                  label="Latest"
                  value={formatShortDate(latest?.activity.summary.startTime ?? null)}
                />
                <MiniCell label="Dist" value={formatDistance(item.segment.stats.distanceMeters)} />
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
