import type { SegmentListResponse } from "@ride-lens/api";
import { useEffect, useMemo, useState } from "react";

import { listSegments } from "../rides/api";
import { AppHeader } from "../rides/components/app-header";
import { errorToMessage } from "../rides/formatters";
import type { LoadState } from "../rides/types";
import { SummaryCell } from "./components/segment-cells";
import { SegmentDetail } from "./components/segment-detail";
import { SegmentList } from "./components/segment-list";
import { summarizeSegments } from "./segment-efforts";
import {
  sectionHeaderClassName,
  sectionTitleClassName,
  statusErrorClassName,
} from "./segment-styles";

const EMPTY_SEGMENTS: SegmentListResponse = { segments: [] };

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
      <div className="mx-auto max-w-[1240px] px-5 pb-[60px] sm:px-7">
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
