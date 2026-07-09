import type { SegmentEffort, SegmentWithEfforts } from "../rides/types";

export function rankEfforts(efforts: ReadonlyArray<SegmentEffort>) {
  return efforts
    .slice()
    .sort((left, right) => {
      const leftElapsed = left.stats.elapsedSeconds ?? Number.POSITIVE_INFINITY;
      const rightElapsed = right.stats.elapsedSeconds ?? Number.POSITIVE_INFINITY;
      if (leftElapsed !== rightElapsed) return leftElapsed - rightElapsed;
      return (right.activity.summary.startTime ?? "").localeCompare(
        left.activity.summary.startTime ?? "",
      );
    })
    .map((effort, index) => ({ effort, rank: index + 1 }));
}

export function bestEffort(efforts: ReadonlyArray<SegmentEffort>): SegmentEffort | null {
  return rankEfforts(efforts)[0]?.effort ?? null;
}

export function latestEffort(efforts: ReadonlyArray<SegmentEffort>): SegmentEffort | null {
  return (
    efforts
      .slice()
      .sort((left, right) =>
        (right.activity.summary.startTime ?? "").localeCompare(
          left.activity.summary.startTime ?? "",
        ),
      )[0] ?? null
  );
}

export function summarizeSegments(segments: ReadonlyArray<SegmentWithEfforts>) {
  return {
    segmentCount: segments.length,
    effortCount: segments.reduce((sum, segment) => sum + segment.efforts.length, 0),
    matchedCount: segments.reduce(
      (sum, segment) =>
        sum + segment.efforts.filter((effort) => effort.source === "matched").length,
      0,
    ),
  };
}
