import { cn } from "@ride-lens/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import {
  formatBpm,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatRideTitle,
  formatSpeed,
} from "../../rides/formatters";
import type { SegmentEffort, SegmentWithEfforts } from "../../rides/types";
import { latestEffort, rankEfforts } from "../segment-efforts";
import {
  sectionHeaderClassName,
  sectionSubClassName,
  sectionTitleClassName,
  tableCellClassName,
  tableHeadClassName,
} from "../segment-styles";
import { MiniCell, SummaryCell } from "./segment-cells";

export function SegmentDetail({ segment }: { readonly segment: SegmentWithEfforts | null }) {
  const rankedEfforts = useMemo(() => rankEfforts(segment?.efforts ?? []), [segment]);
  const best = rankedEfforts[0]?.effort ?? null;
  const latest = latestEffort(segment?.efforts ?? []);
  const source = segment?.efforts.find((effort) => effort.source === "source") ?? null;

  if (segment === null) {
    return (
      <div className="border border-ride-line bg-ride-abyss px-5 py-12 text-center font-ride text-sm text-ride-ink-dim">
        Select a segment to compare efforts.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className={sectionHeaderClassName}>
        <div>
          <div className={sectionTitleClassName}>Segment detail</div>
          <div className="mt-1 max-w-[620px] truncate font-ride text-[18px] font-extrabold uppercase text-ride-ink">
            {segment.segment.name}
          </div>
        </div>
        <div className={sectionSubClassName}>
          created {formatDateTime(segment.segment.createdAt)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px border border-ride-line bg-ride-line-soft max-[900px]:grid-cols-2">
        <SummaryCell
          label="Best elapsed"
          value={formatDuration(best?.stats.elapsedSeconds ?? null)}
        />
        <SummaryCell
          label="Best speed"
          value={formatSpeed(best?.stats.averageSpeedMetersPerSecond ?? null)}
        />
        <SummaryCell label="Efforts" value={String(segment.efforts.length)} />
        <SummaryCell
          label="Distance"
          value={formatDistance(segment.segment.stats.distanceMeters)}
        />
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-px border border-ride-line bg-ride-line-soft max-[900px]:grid-cols-1">
        <EffortFeature label="Source" effort={source} tone="source" />
        <EffortFeature label="Best" effort={best} tone="best" />
        <EffortFeature label="Latest" effort={latest} tone="latest" />
      </div>

      <div className="mt-3.5 border border-ride-line bg-ride-abyss">
        <div className="flex items-center justify-between border-b border-ride-line px-3.5 py-2.5">
          <div className={sectionTitleClassName}>Efforts</div>
          <div className={sectionSubClassName}>ranked by elapsed time</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[54px]" />
              <col />
              <col className="w-[92px]" />
              <col className="w-[100px]" />
              <col className="w-[96px]" />
              <col className="w-[92px]" />
              <col className="w-[92px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={tableHeadClassName}>#</th>
                <th className={tableHeadClassName}>Ride</th>
                <th className={cn(tableHeadClassName, "text-right")}>Elapsed</th>
                <th className={cn(tableHeadClassName, "text-right")}>Avg</th>
                <th className={cn(tableHeadClassName, "text-right")}>HR</th>
                <th className={cn(tableHeadClassName, "text-right")}>Gain</th>
                <th className={cn(tableHeadClassName, "text-right")}>Match</th>
                <th className={cn(tableHeadClassName, "text-right")}>Source</th>
              </tr>
            </thead>
            <tbody>
              {rankedEfforts.map(({ effort, rank }) => (
                <EffortRow
                  key={effort.id}
                  effort={effort}
                  rank={rank}
                  bestElapsed={best?.stats.elapsedSeconds ?? null}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EffortRow({
  effort,
  rank,
  bestElapsed,
}: {
  readonly effort: SegmentEffort;
  readonly rank: number;
  readonly bestElapsed: number | null;
}) {
  const delta =
    bestElapsed !== null && effort.stats.elapsedSeconds !== null
      ? effort.stats.elapsedSeconds - bestElapsed
      : null;

  return (
    <tr className="transition-colors hover:[&>td]:bg-[rgb(255_199_44_/_0.06)]">
      <td className={tableCellClassName}>{String(rank).padStart(2, "0")}</td>
      <td className={cn(tableCellClassName, "min-w-0 whitespace-normal leading-[1.25]")}>
        <Link
          to="/rides/$activityId"
          params={{ activityId: effort.activityId }}
          className="font-ride text-[12px] font-bold uppercase text-ride-ink no-underline hover:text-ride-amber"
        >
          {formatRideTitle(effort.activity)}
        </Link>
        <div className="mt-0.5 font-ride-mono text-[10px] text-ride-ink-dim">
          {formatDateTime(effort.activity.summary.startTime)}
        </div>
      </td>
      <td className={cn(tableCellClassName, "text-right text-ride-amber-bright")}>
        {formatDuration(effort.stats.elapsedSeconds)}
        {delta !== null && delta > 0 ? (
          <div className="text-[10px] text-ride-ink-dim">+{formatDuration(delta)}</div>
        ) : null}
      </td>
      <td className={cn(tableCellClassName, "text-right")}>
        {formatSpeed(effort.stats.averageSpeedMetersPerSecond)}
      </td>
      <td className={cn(tableCellClassName, "text-right")}>
        {formatBpm(effort.stats.averageHeartRateBpm)}
      </td>
      <td className={cn(tableCellClassName, "text-right")}>
        {formatElevation(effort.stats.elevationGainMeters)} m
      </td>
      <td className={cn(tableCellClassName, "text-right")}>
        {Math.round(effort.confidence * 100)}%
      </td>
      <td className={cn(tableCellClassName, "text-right")}>{effort.source}</td>
    </tr>
  );
}

function EffortFeature({
  label,
  effort,
  tone,
}: {
  readonly label: string;
  readonly effort: SegmentEffort | null;
  readonly tone: "source" | "best" | "latest";
}) {
  const toneClassName = {
    source: "text-ride-tail",
    best: "text-ride-amber-bright",
    latest: "text-ride-ink",
  }[tone];

  return (
    <div className="min-w-0 bg-ride-abyss p-3.5">
      <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">{label}</div>
      {effort ? (
        <>
          <div
            className={cn("mt-1 truncate font-ride text-[13px] font-bold uppercase", toneClassName)}
          >
            {formatRideTitle(effort.activity)}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-px bg-ride-line-soft">
            <MiniCell label="Elapsed" value={formatDuration(effort.stats.elapsedSeconds)} />
            <MiniCell label="Speed" value={formatSpeed(effort.stats.averageSpeedMetersPerSecond)} />
            <MiniCell label="HR" value={formatBpm(effort.stats.averageHeartRateBpm)} />
          </div>
        </>
      ) : (
        <div className="mt-1 font-ride-mono text-[12px] text-ride-ink-dim">n/a</div>
      )}
    </div>
  );
}
