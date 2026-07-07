import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
} from "@ride-lens/api";
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
      <div className="wrap">
        <header className="road-header">
          <div className="rh-row">
            <a className="rh-title" href="/">
              Ride Lens
            </a>
            <span className="rh-line" aria-hidden="true" />
            <div className="rh-actions">
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
                className="rh-btn"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUpIcon />
                {uploading ? formatUploadProgress(uploadProgress) : "Upload FIT"}
              </button>
            </div>
          </div>
        </header>

        {uploadError ? <div className="status error">{uploadError}</div> : null}
        {activitiesState.error ? <div className="status error">{activitiesState.error}</div> : null}
        {activityRoutesState.error ? (
          <div className="status error">{activityRoutesState.error}</div>
        ) : null}

        {activities.length === 0 && !activitiesState.loading ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <section className="section">
            <div className="ride-overview-grid">
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

              <div className="ride-map-panel">
                <div className="sec-head">
                  <div className="sec-sub">
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
          <section className="section">
            <div className="sec-head">
              <div className="sec-title">Selected ride</div>
              {detailState.loading ? <div className="sec-sub">loading detail</div> : null}
            </div>
            <RideDetail
              activity={selectedActivity}
              detail={detailState.data}
              loading={detailState.loading}
              error={detailState.error}
            />
          </section>
        ) : null}

        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Season snapshot</div>
            <div className="sec-sub">
              {snapshot.activeMonths} active {snapshot.activeMonths === 1 ? "month" : "months"}
            </div>
          </div>
          <SeasonSnapshot snapshot={snapshot} totals={totals} onSelect={handleSelectActivity} />
        </section>

        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Recent vs previous</div>
            <div className="sec-sub">last 4 rides vs previous 4</div>
          </div>
          <RecentComparison snapshot={snapshot} />
        </section>

        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Year progress</div>
            <div className="sec-sub">{formatDistance(monthlyDistance(activities))} this year</div>
          </div>
          <YearProgress activities={activities} />
        </section>

        <footer>
          <span>Ride Lens</span>
          <span>private cycling analytics</span>
          <span>{formatDistance(totals.distanceMeters)} &amp; counting</span>
        </footer>
      </div>
    </div>
  );
}
