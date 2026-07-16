import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
  ActivitySegmentsResponse,
  HeartRateZoneProfileResponse,
  HeartRateZoneSeasonResponse,
} from "@ride-lens/api";
import { cn } from "@ride-lens/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  createSegment,
  getHeartRateZoneProfile,
  getHeartRateZoneSeason,
  getActivity,
  importFitFile,
  listActivities,
  listActivityRoutes,
  listActivitySegments,
  updateSegment,
} from "./api";
import { AppHeader } from "./components/app-header";
import { EmptyState } from "./components/empty-state";
import { RideDetail } from "./components/ride-detail";
import { RideLog } from "./components/ride-log";
import { SeasonSnapshot } from "./components/season-snapshot";
import { SeasonHeartRateZones } from "./components/season-heart-rate-zones";
import { YearProgress } from "./components/year-progress";
import { EMPTY_LIST, EMPTY_ROUTES, RIDE_LOG_PAGE_SIZE } from "./constants";
import {
  errorToMessage,
  formatDistance,
  formatImportFailures,
  formatUploadProgress,
} from "./formatters";
import { AllRidesMap } from "./map/route/all-rides-map";
import { monthlyDistance, summarizeActivities, summarizeSeason } from "./season";
import type { LoadState } from "./types";

const statusErrorClassName =
  "mt-[18px] border border-ride-line border-l-[3px] border-l-ride-danger px-3.5 py-3 text-sm text-[#e6a59d]";

const sectionHeaderClassName = "mb-5 flex flex-wrap items-baseline justify-between gap-5";

const sectionTitleClassName = "font-ride text-[13px] font-bold uppercase text-ride-ink-muted";

const sectionSubClassName = "font-ride text-[11px] text-ride-ink-dim";

const EMPTY_ACTIVITY_SEGMENTS: ActivitySegmentsResponse = { segments: [] };
const EMPTY_HEART_RATE_ZONE_PROFILE: HeartRateZoneProfileResponse = { profile: null };

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
  const [activitySegmentsState, setActivitySegmentsState] = useState<
    LoadState<ActivitySegmentsResponse>
  >({
    data: EMPTY_ACTIVITY_SEGMENTS,
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
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [segmentMutationError, setSegmentMutationError] = useState<string | null>(null);
  const [heartRateZoneProfileState, setHeartRateZoneProfileState] = useState<
    LoadState<HeartRateZoneProfileResponse>
  >({ data: EMPTY_HEART_RATE_ZONE_PROFILE, error: null, loading: true });
  const [heartRateZoneSeasonState, setHeartRateZoneSeasonState] = useState<
    LoadState<HeartRateZoneSeasonResponse>
  >({ data: null, error: null, loading: true });

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

  const loadHeartRateZoneData = async () => {
    setHeartRateZoneProfileState((current) => ({ ...current, error: null, loading: true }));
    setHeartRateZoneSeasonState((current) => ({ ...current, error: null, loading: true }));

    const year = new Date().getFullYear();
    const [profileResult, seasonResult] = await Promise.allSettled([
      getHeartRateZoneProfile(),
      getHeartRateZoneSeason(year),
    ]);

    if (profileResult.status === "fulfilled") {
      setHeartRateZoneProfileState({ data: profileResult.value, error: null, loading: false });
    } else {
      setHeartRateZoneProfileState((current) => ({
        ...current,
        error: errorToMessage(profileResult.reason, "Could not load heart-rate zones."),
        loading: false,
      }));
    }

    if (seasonResult.status === "fulfilled") {
      setHeartRateZoneSeasonState({ data: seasonResult.value, error: null, loading: false });
    } else {
      setHeartRateZoneSeasonState((current) => ({
        ...current,
        error: errorToMessage(seasonResult.reason, "Could not load season heart-rate zones."),
        loading: false,
      }));
    }
  };

  useEffect(() => {
    void Promise.all([refreshDashboard(), loadHeartRateZoneData()]);
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

  useEffect(() => {
    if (selectedActivityId === null) {
      setActivitySegmentsState({ data: EMPTY_ACTIVITY_SEGMENTS, error: null, loading: false });
      return;
    }

    let cancelled = false;
    setActivitySegmentsState((current) => ({ ...current, error: null, loading: true }));
    listActivitySegments(selectedActivityId)
      .then((segments) => {
        if (!cancelled) {
          setActivitySegmentsState({ data: segments, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setActivitySegmentsState({
            data: EMPTY_ACTIVITY_SEGMENTS,
            error: errorToMessage(error, "Could not load ride segments."),
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedActivityId]);

  const handleCreateSegment = async ({
    name,
    startRecordIndex,
    endRecordIndex,
  }: {
    readonly name: string;
    readonly startRecordIndex: number;
    readonly endRecordIndex: number;
  }) => {
    if (selectedActivityId === null) return;

    setCreatingSegment(true);
    setSegmentMutationError(null);
    try {
      await createSegment({
        activityId: selectedActivityId,
        name,
        startRecordIndex,
        endRecordIndex,
      });
      const segments = await listActivitySegments(selectedActivityId);
      setActivitySegmentsState({ data: segments, error: null, loading: false });
    } catch (error) {
      setSegmentMutationError(errorToMessage(error, "Could not save segment."));
      throw error;
    } finally {
      setCreatingSegment(false);
    }
  };

  const handleUpdateSegment = async (
    segmentId: string,
    {
      name,
      startRecordIndex,
      endRecordIndex,
    }: {
      readonly name: string;
      readonly startRecordIndex: number;
      readonly endRecordIndex: number;
    },
  ) => {
    if (selectedActivityId === null) return;

    setCreatingSegment(true);
    setSegmentMutationError(null);
    try {
      await updateSegment(segmentId, { name, startRecordIndex, endRecordIndex });
      const segments = await listActivitySegments(selectedActivityId);
      setActivitySegmentsState({ data: segments, error: null, loading: false });
    } catch (error) {
      setSegmentMutationError(errorToMessage(error, "Could not update segment."));
      throw error;
    } finally {
      setCreatingSegment(false);
    }
  };

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
        await Promise.all([refreshDashboard(selectedImportId), loadHeartRateZoneData()]);
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".fit"
          multiple
          hidden
          onChange={(event) => void handleUpload(event.currentTarget.files)}
        />
        <AppHeader
          uploading={uploading}
          uploadLabel={uploading ? formatUploadProgress(uploadProgress) : "Upload FIT"}
          onUpload={() => fileInputRef.current?.click()}
        />

        {uploadError ? <div className={statusErrorClassName}>{uploadError}</div> : null}
        {activitiesState.error ? (
          <div className={statusErrorClassName}>{activitiesState.error}</div>
        ) : null}
        {activityRoutesState.error ? (
          <div className={statusErrorClassName}>{activityRoutesState.error}</div>
        ) : null}
        {activitySegmentsState.error ? (
          <div className={statusErrorClassName}>{activitySegmentsState.error}</div>
        ) : null}
        {heartRateZoneProfileState.error ? (
          <div className={statusErrorClassName}>{heartRateZoneProfileState.error}</div>
        ) : null}
        {heartRateZoneSeasonState.error ? (
          <div className={statusErrorClassName}>{heartRateZoneSeasonState.error}</div>
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
              segments={activitySegmentsState.data?.segments ?? []}
              creatingSegment={creatingSegment}
              segmentError={segmentMutationError}
              onCreateSegment={handleCreateSegment}
              onUpdateSegment={handleUpdateSegment}
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
            <div className={sectionTitleClassName}>Year progress</div>
            <div className={sectionSubClassName}>
              {formatDistance(monthlyDistance(activities))} this year
            </div>
          </div>
          <YearProgress activities={activities} />
        </section>

        {heartRateZoneProfileState.data?.profile ? (
          <section className="mt-12">
            <div className={sectionHeaderClassName}>
              <div className={sectionTitleClassName}>Season effort</div>
              <div className={sectionSubClassName}>
                {heartRateZoneSeasonState.loading
                  ? "recalculating rides"
                  : `${new Date().getFullYear()} heart-rate distribution`}
              </div>
            </div>
            {heartRateZoneSeasonState.data ? (
              <SeasonHeartRateZones season={heartRateZoneSeasonState.data} />
            ) : null}
          </section>
        ) : null}

        <footer className="mt-12 flex justify-between border-t border-ride-line-soft pt-[18px] font-ride text-xs font-semibold uppercase text-ride-ink-dim">
          <span>Ride Lens</span>
          <span>private cycling analytics</span>
          <span>{formatDistance(totals.distanceMeters)} &amp; counting</span>
        </footer>
      </div>
    </div>
  );
}
