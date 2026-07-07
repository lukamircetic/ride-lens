import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
} from "@ride-lens/api";
import { cn } from "@ride-lens/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { FileUpIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getActivity, importFitFile, listActivities, listActivityRoutes } from "./api";
import { EmptyState } from "./components/empty-state";
import { RecentComparison } from "./components/recent-comparison";
import { RideDetail } from "./components/ride-detail";
import { RideLog } from "./components/ride-log";
import { SeasonSnapshot } from "./components/season-snapshot";
import { YearProgress } from "./components/year-progress";
import { EMPTY_LIST, EMPTY_ROUTES, RIDE_LOG_PAGE_SIZE } from "./constants";
import {
  errorToMessage,
  formatDistance,
  formatImportFailures,
  formatUploadProgress,
} from "./formatters";
import { AllRidesMap } from "./map/all-rides-map";
import { monthlyDistance, summarizeActivities, summarizeSeason } from "./season";
import type { LoadState } from "./types";

const statusErrorClassName =
  "mt-[18px] border border-ride-line border-l-[3px] border-l-ride-danger px-3.5 py-3 text-sm text-[#e6a59d]";

const sectionHeaderClassName = "mb-5 flex flex-wrap items-baseline justify-between gap-5";

const sectionTitleClassName = "font-ride text-[13px] font-bold uppercase text-ride-ink-muted";

const sectionSubClassName = "font-ride text-[11px] text-ride-ink-dim";

const uploadButtonClassName =
  "inline-flex cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3.5 py-[9px] font-ride text-xs font-bold uppercase text-ride-ink transition-colors hover:border-ride-amber hover:text-ride-amber disabled:cursor-default disabled:opacity-50 [&_svg]:size-[15px]";

export function RideDashboard({
  initialActivityId = null,
}: {
  readonly initialActivityId?: string | null;
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activitiesState, setActivitiesState] = useState<LoadState<ActivityListResponse>>({
    data: EMPTY_LIST,
    error: null,
    loading: true,
  });
  const [activityRoutesState, setActivityRoutesState] = useState<LoadState<ActivityRoutesResponse>>(
    {
      data: EMPTY_ROUTES,
      error: null,
      loading: true,
    },
  );
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(initialActivityId);
  const [detailState, setDetailState] = useState<LoadState<ActivityDetailResponse>>({
    data: null,
    error: null,
    loading: false,
  });
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [rideLogPage, setRideLogPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    readonly current: number;
    readonly total: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activities = activitiesState.data?.activities ?? [];
  const activityRoutes = activityRoutesState.data?.routes ?? [];
  const selectedActivity =
    detailState.data?.activity ??
    activities.find((activity) => activity.id === selectedActivityId) ??
    null;

  const loadActivities = async (nextSelectedId?: string) => {
    setActivitiesState((current) => ({ ...current, error: null, loading: true }));

    try {
      const list = await listActivities();
      setActivitiesState({ data: list, error: null, loading: false });

      const preferredId = nextSelectedId ?? selectedActivityId;
      const nextActivity =
        list.activities.find((activity) => activity.id === preferredId) ??
        list.activities[0] ??
        null;
      setSelectedActivityId(nextActivity?.id ?? null);
    } catch (error) {
      setActivitiesState({
        data: activitiesState.data,
        error: errorToMessage(error, "Could not load rides."),
        loading: false,
      });
    }
  };

  const loadActivityRoutes = async () => {
    setActivityRoutesState((current) => ({ ...current, error: null, loading: true }));

    try {
      const routes = await listActivityRoutes();
      setActivityRoutesState({ data: routes, error: null, loading: false });
    } catch (error) {
      setActivityRoutesState({
        data: activityRoutesState.data,
        error: errorToMessage(error, "Could not load ride routes."),
        loading: false,
      });
    }
  };

  const refreshDashboard = async (nextSelectedId?: string) => {
    await Promise.all([loadActivities(nextSelectedId), loadActivityRoutes()]);
  };

  useEffect(() => {
    void refreshDashboard();
  }, []);

  useEffect(() => {
    if (initialActivityId !== selectedActivityId) {
      setSelectedActivityId(initialActivityId);
    }
  }, [initialActivityId]);

  useEffect(() => {
    if (selectedActivityId === null) {
      setDetailState({ data: null, error: null, loading: false });
      return;
    }

    let cancelled = false;
    setDetailState((current) => ({ ...current, error: null, loading: true }));
    getActivity(selectedActivityId)
      .then((detail) => {
        if (!cancelled) setDetailState({ data: detail, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailState({
            data: null,
            error: errorToMessage(error, "Could not load ride details."),
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedActivityId]);

  const handleUpload = async (files: FileList | null | undefined) => {
    const uploadFiles = files ? Array.from(files) : [];
    if (uploadFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 1, total: uploadFiles.length });
    setUploadError(null);

    try {
      const importedIds: Array<string> = [];
      const failures: Array<string> = [];

      for (const [index, file] of uploadFiles.entries()) {
        setUploadProgress({ current: index + 1, total: uploadFiles.length });

        try {
          const imported = await importFitFile(file);
          importedIds.push(imported.importId);
        } catch (error) {
          failures.push(`${file.name}: ${errorToMessage(error, "Import failed.")}`);
        }
      }

      const selectedImportId = importedIds.at(-1);
      if (selectedImportId) {
        await refreshDashboard(selectedImportId);
        await navigate({ to: "/rides/$activityId", params: { activityId: selectedImportId } });
      }

      if (failures.length > 0) {
        setUploadError(formatImportFailures(failures, uploadFiles.length));
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSelectActivity = (activityId: string) => {
    setSelectedActivityId(activityId);
    void navigate({ to: "/rides/$activityId", params: { activityId } });
  };

  const totals = useMemo(() => summarizeActivities(activities), [activities]);
  const snapshot = useMemo(() => summarizeSeason(activities), [activities]);
  const rideLogPageCount = Math.max(1, Math.ceil(activities.length / RIDE_LOG_PAGE_SIZE));

  useEffect(() => {
    if (rideLogPage >= rideLogPageCount) {
      setRideLogPage(rideLogPageCount - 1);
    }
  }, [rideLogPage, rideLogPageCount]);

  return (
    <div data-app="ride-lens">
      <div className="mx-auto max-w-[1240px] px-7 pb-[60px]">
        <header className="pt-[26px] pb-[22px]">
          <div className="flex items-center gap-[22px]">
            <a
              className="whitespace-nowrap font-ride text-[30px] leading-none font-black uppercase text-ride-ink no-underline"
              href="/"
            >
              Ride Lens
            </a>
            <span
              className="h-[3px] flex-1 -translate-y-0.5 bg-[repeating-linear-gradient(90deg,var(--amber)_0_26px,transparent_26px_44px)]"
              aria-hidden="true"
            />
            <div className="flex gap-2 whitespace-nowrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".fit"
                multiple
                hidden
                onChange={(event) => void handleUpload(event.currentTarget.files)}
              />
              <button
                type="button"
                className={uploadButtonClassName}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUpIcon />
                {uploading ? formatUploadProgress(uploadProgress) : "Upload FIT"}
              </button>
            </div>
          </div>
        </header>

        {uploadError ? <div className={statusErrorClassName}>{uploadError}</div> : null}
        {activitiesState.error ? (
          <div className={statusErrorClassName}>{activitiesState.error}</div>
        ) : null}
        {activityRoutesState.error ? (
          <div className={statusErrorClassName}>{activityRoutesState.error}</div>
        ) : null}

        {activities.length === 0 && !activitiesState.loading ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <section className="mt-12">
            <div className="grid grid-cols-[minmax(360px,0.72fr)_minmax(520px,1.28fr)] items-stretch gap-[18px] max-[900px]:grid-cols-1">
              <RideLog
                activities={activities}
                selectedActivityId={selectedActivityId}
                hoveredActivityId={hoveredActivityId}
                loading={activitiesState.loading}
                page={rideLogPage}
                pageCount={rideLogPageCount}
                onPageChange={setRideLogPage}
                onSelectActivity={handleSelectActivity}
                onHoverActivity={setHoveredActivityId}
              />

              <div className="flex min-w-0 flex-col">
                <div className={cn(sectionHeaderClassName, "mb-3 justify-end")}>
                  <div className={sectionSubClassName}>
                    {activityRoutesState.loading
                      ? "loading routes"
                      : `${activityRoutes.length} mapped rides`}
                  </div>
                </div>
                <AllRidesMap
                  routes={activityRoutes}
                  selectedActivityId={selectedActivityId}
                  hoveredActivityId={hoveredActivityId}
                  loading={activityRoutesState.loading}
                  onSelect={handleSelectActivity}
                />
              </div>
            </div>
          </section>
        )}

        {selectedActivity ? (
          <section className="mt-12">
            <div className={sectionHeaderClassName}>
              <div className={sectionTitleClassName}>Selected ride</div>
              {detailState.loading ? (
                <div className={sectionSubClassName}>loading detail</div>
              ) : null}
            </div>
            <RideDetail
              activity={selectedActivity}
              detail={detailState.data}
              loading={detailState.loading}
              error={detailState.error}
            />
          </section>
        ) : null}

        <section className="mt-12">
          <div className={sectionHeaderClassName}>
            <div className={sectionTitleClassName}>Season snapshot</div>
            <div className={sectionSubClassName}>
              {snapshot.activeMonths} active {snapshot.activeMonths === 1 ? "month" : "months"}
            </div>
          </div>
          <SeasonSnapshot snapshot={snapshot} totals={totals} onSelect={handleSelectActivity} />
        </section>

        <section className="mt-12">
          <div className={sectionHeaderClassName}>
            <div className={sectionTitleClassName}>Recent vs previous</div>
            <div className={sectionSubClassName}>last 4 rides vs previous 4</div>
          </div>
          <RecentComparison snapshot={snapshot} />
        </section>

        <section className="mt-12">
          <div className={sectionHeaderClassName}>
            <div className={sectionTitleClassName}>Year progress</div>
            <div className={sectionSubClassName}>
              {formatDistance(monthlyDistance(activities))} this year
            </div>
          </div>
          <YearProgress activities={activities} />
        </section>

        <footer className="mt-12 flex justify-between border-t border-ride-line-soft pt-[18px] font-ride text-xs font-semibold uppercase text-ride-ink-dim">
          <span>Ride Lens</span>
          <span>private cycling analytics</span>
          <span>{formatDistance(totals.distanceMeters)} &amp; counting</span>
        </footer>
      </div>
    </div>
  );
}
