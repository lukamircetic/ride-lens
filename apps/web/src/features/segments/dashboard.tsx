import { cn } from "@ride-lens/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { listSegments } from "../rides/api";
import { AppHeader } from "../rides/components/app-header";
import {
  errorToMessage,
  formatBpm,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatRideTitle,
  formatShortDate,
  formatSpeed,
} from "../rides/formatters";
import type { SegmentListResponse } from "@ride-lens/api";

import type { LoadState, SegmentEffort, SegmentWithEfforts } from "../rides/types";

const EMPTY_SEGMENTS: SegmentListResponse = { segments: [] };

const statusErrorClassName =
  "mt-[18px] border border-ride-line border-l-[3px] border-l-ride-danger px-3.5 py-3 text-sm text-[#e6a59d]";

const sectionHeaderClassName = "mb-5 flex flex-wrap items-baseline justify-between gap-5";

const sectionTitleClassName = "font-ride text-[13px] font-bold uppercase text-ride-ink-muted";

const sectionSubClassName = "font-ride text-[11px] text-ride-ink-dim";

const tableHeadClassName =
  "h-9 border-b border-ride-line px-[9px] text-left font-ride text-[11px] font-semibold uppercase text-ride-ink-dim";

const tableCellClassName =
  "h-[44px] whitespace-nowrap border-b border-ride-line-soft px-[9px] font-ride-mono text-[13px] text-ride-ink-muted";

export function SegmentDashboard() {
  const [segmentsState, setSegmentsState] = useState<LoadState<typeof EMPTY_SEGMENTS>>({
    data: EMPTY_SEGMENTS,
    error: null,
    loading: true,
  });
  const segments = segmentsState.data?.segments ?? [];
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const selectedSegment =
    segments.find(({ segment }) => segment.id === selectedSegmentId) ?? segments[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    setSegmentsState((current) => ({ ...current, error: null, loading: true }));
    listSegments()
      .then((data) => {
        if (!cancelled) setSegmentsState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSegmentsState({
            data: EMPTY_SEGMENTS,
            error: errorToMessage(error, "Could not load segments."),
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (segments.length === 0) {
      setSelectedSegmentId(null);
      return;
    }

    setSelectedSegmentId((current) =>
      current !== null && segments.some(({ segment }) => segment.id === current)
        ? current
        : (segments[0]?.segment.id ?? null),
    );
  }, [segments]);

  const totals = useMemo(() => summarizeSegments(segments), [segments]);

  return (
    <div data-app="ride-lens">
      <div className="mx-auto max-w-[1240px] px-7 pb-[60px]">
        <AppHeader />

        {segmentsState.error ? (
          <div className={statusErrorClassName}>{segmentsState.error}</div>
        ) : null}

        <section className="mt-12">
          <div className={sectionHeaderClassName}>
            <div>
              <div className={sectionTitleClassName}>Segments</div>
              <div className="mt-1 font-ride text-[11px] uppercase text-ride-ink-dim">
                saved efforts across matched rides
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px border border-ride-line bg-ride-line-soft">
              <SummaryCell label="Segments" value={String(totals.segmentCount)} />
              <SummaryCell label="Efforts" value={String(totals.effortCount)} />
              <SummaryCell label="Matched" value={String(totals.matchedCount)} />
            </div>
          </div>

          {segments.length === 0 && !segmentsState.loading ? (
            <div className="border border-ride-line bg-ride-abyss px-5 py-12 text-center">
              <div className="font-ride text-[13px] font-bold uppercase text-ride-ink-muted">
                No saved segments
              </div>
              <div className="mx-auto mt-2 max-w-[460px] font-ride text-sm text-ride-ink-dim">
                Create a segment from a selected ride map, then come back here to compare the
                matched efforts.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(320px,0.52fr)_minmax(560px,1.48fr)] gap-[18px] max-[980px]:grid-cols-1">
              <SegmentList
                segments={segments}
                selectedSegmentId={selectedSegment?.segment.id ?? null}
                loading={segmentsState.loading}
                onSelect={setSelectedSegmentId}
              />
              <SegmentDetail segment={selectedSegment} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SegmentList({
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
            <button
              key={item.segment.id}
              type="button"
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentDetail({ segment }: { readonly segment: SegmentWithEfforts | null }) {
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

function SummaryCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-[112px] bg-ride-abyss px-3.5 py-3">
      <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className="mt-1 font-ride-mono text-[18px] font-semibold text-ride-ink">{value}</div>
    </div>
  );
}

function MiniCell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 bg-ride-abyss px-2 py-1.5">
      <div className="font-ride text-[8px] font-bold uppercase text-ride-ink-dim">{label}</div>
      <div className="mt-0.5 truncate font-ride-mono text-[11px] text-ride-ink-muted">{value}</div>
    </div>
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

function rankEfforts(efforts: ReadonlyArray<SegmentEffort>) {
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

function bestEffort(efforts: ReadonlyArray<SegmentEffort>): SegmentEffort | null {
  return rankEfforts(efforts)[0]?.effort ?? null;
}

function latestEffort(efforts: ReadonlyArray<SegmentEffort>): SegmentEffort | null {
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

function summarizeSegments(segments: ReadonlyArray<SegmentWithEfforts>) {
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
