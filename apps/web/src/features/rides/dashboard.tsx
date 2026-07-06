import type {
  ActivityDetailResponse,
  ActivityListResponse,
  FitImportResponse,
} from "@ride-lens/api";
import { Button } from "@ride-lens/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import {
  ActivityIcon,
  BikeIcon,
  CalendarDaysIcon,
  FileUpIcon,
  GaugeIcon,
  HeartPulseIcon,
  MapIcon,
  MountainIcon,
  RefreshCwIcon,
  RouteIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ActivityListItem = ActivityListResponse["activities"][number];
type ActivityRecord = ActivityDetailResponse["records"][number];
type ActivityLap = ActivityDetailResponse["laps"][number];

interface LoadState<A> {
  readonly data: A | null;
  readonly error: string | null;
  readonly loading: boolean;
}

const EMPTY_LIST: ActivityListResponse = { activities: [] };
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(initialActivityId);
  const [detailState, setDetailState] = useState<LoadState<ActivityDetailResponse>>({
    data: null,
    error: null,
    loading: false,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    readonly current: number;
    readonly total: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activities = activitiesState.data?.activities ?? [];
  const selectedActivity =
    detailState.data?.activity ??
    activities.find((activity) => activity.id === selectedActivityId) ??
    null;

  const loadActivities = async (nextSelectedId?: string) => {
    setActivitiesState((current) => ({ ...current, error: null, loading: true }));
    try {
      const list = await requestJson<ActivityListResponse>("/api/activities");
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

  useEffect(() => {
    void loadActivities();
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
    requestJson<ActivityDetailResponse>(`/api/activities/${selectedActivityId}`)
      .then((detail) => {
        if (!cancelled) {
          setDetailState({ data: detail, error: null, loading: false });
        }
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
    if (uploadFiles.length === 0) {
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 1, total: uploadFiles.length });
    setUploadError(null);
    try {
      const importedIds: Array<string> = [];
      const failures: Array<string> = [];

      for (const [index, file] of uploadFiles.entries()) {
        setUploadProgress({ current: index + 1, total: uploadFiles.length });
        try {
          const imported = await uploadFitFile(file);
          importedIds.push(imported.importId);
        } catch (error) {
          failures.push(`${file.name}: ${errorToMessage(error, "Import failed.")}`);
        }
      }

      const selectedImportId = importedIds.at(-1);
      if (selectedImportId) {
        await loadActivities(selectedImportId);
        await navigate({
          to: "/rides/$activityId",
          params: { activityId: selectedImportId },
        });
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
    void navigate({
      to: "/rides/$activityId",
      params: { activityId },
    });
  };

  const totals = useMemo(() => summarizeActivities(activities), [activities]);

  return (
    <main className="min-h-0 overflow-auto bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BikeIcon className="size-4 text-emerald-500" />
              <span>Ride Lens</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
              Cycling activity dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".fit"
              multiple
              className="hidden"
              onChange={(event) => void handleUpload(event.currentTarget.files)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUpIcon data-icon="inline-start" />
              {uploading ? formatUploadProgress(uploadProgress) : "Upload FIT"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={activitiesState.loading}
              onClick={() => void loadActivities()}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </header>

        {uploadError ? <StatusMessage tone="error" message={uploadError} /> : null}
        {activitiesState.error ? (
          <StatusMessage tone="error" message={activitiesState.error} />
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            icon={<ActivityIcon className="size-4 text-sky-500" />}
            label="Rides"
            value={String(totals.rideCount)}
            detail={`${formatDistance(totals.distanceMeters)} logged`}
          />
          <MetricTile
            icon={<TimerIcon className="size-4 text-amber-500" />}
            label="Moving time"
            value={formatDuration(totals.movingSeconds)}
            detail={`${formatDuration(totals.elapsedSeconds)} elapsed`}
          />
          <MetricTile
            icon={<MountainIcon className="size-4 text-emerald-500" />}
            label="Elevation"
            value={formatElevation(totals.ascentMeters)}
            detail={`${formatElevation(totals.descentMeters)} down`}
          />
          <MetricTile
            icon={<GaugeIcon className="size-4 text-rose-500" />}
            label="Average speed"
            value={formatSpeed(totals.avgSpeedMetersPerSecond)}
            detail="distance weighted"
          />
        </section>

        <div className="grid min-h-0 gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <RideListPanel
            activities={activities}
            loading={activitiesState.loading}
            selectedActivityId={selectedActivityId}
            onSelect={handleSelectActivity}
          />

          <section className="min-w-0">
            {selectedActivity === null && !activitiesState.loading ? (
              <EmptyRideState onUpload={() => fileInputRef.current?.click()} />
            ) : (
              <RideDetailPanel
                activity={selectedActivity}
                detail={detailState.data}
                loading={detailState.loading}
                error={detailState.error}
              />
            )}
          </section>
        </div>

        <SeasonSnapshot activities={activities} onSelect={handleSelectActivity} />
        <YearProgress activities={activities} />
      </div>
    </main>
  );
}

function RideListPanel({
  activities,
  loading,
  selectedActivityId,
  onSelect,
}: {
  readonly activities: ReadonlyArray<ActivityListItem>;
  readonly loading: boolean;
  readonly selectedActivityId: string | null;
  readonly onSelect: (activityId: string) => void;
}) {
  return (
    <aside className="min-h-0 border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-medium">Rides</div>
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading" : `${activities.length} total`}
        </div>
      </div>
      <div className="max-h-[34rem] overflow-auto">
        {activities.length === 0 ? (
          <div className="px-3 py-8 text-sm text-muted-foreground">No rides imported yet.</div>
        ) : (
          activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              className={[
                "block w-full border-b px-3 py-3 text-left transition-colors hover:bg-muted/60",
                selectedActivityId === activity.id ? "bg-muted" : "bg-card",
              ].join(" ")}
              onClick={() => onSelect(activity.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{formatRideTitle(activity)}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {activity.filename}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {formatDate(activity.summary.startTime)}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <MiniStat
                  label="Distance"
                  value={formatDistance(activity.summary.totalDistanceMeters)}
                />
                <MiniStat
                  label="Time"
                  value={formatDuration(activity.summary.totalMovingSeconds)}
                />
                <MiniStat
                  label="Avg"
                  value={formatSpeed(activity.summary.avgSpeedMetersPerSecond)}
                />
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function SeasonSnapshot({
  activities,
  onSelect,
}: {
  readonly activities: ReadonlyArray<ActivityListItem>;
  readonly onSelect: (activityId: string) => void;
}) {
  const snapshot = useMemo(() => summarizeSeason(activities), [activities]);

  return (
    <section className="border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrophyIcon className="size-4 text-amber-500" />
          Season snapshot
        </div>
        <div className="text-xs text-muted-foreground">
          {snapshot.activeMonths} active {snapshot.activeMonths === 1 ? "month" : "months"}
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-px border-b bg-border lg:grid-cols-2 lg:border-b-0 lg:border-r">
          <SnapshotRideButton
            label="Longest ride"
            activity={snapshot.longestRide}
            value={
              snapshot.longestRide
                ? formatDistance(snapshot.longestRide.summary.totalDistanceMeters)
                : "n/a"
            }
            detail={snapshot.longestRide ? formatDate(snapshot.longestRide.summary.startTime) : ""}
            onSelect={onSelect}
          />
          <SnapshotRideButton
            label="Fastest average"
            activity={snapshot.fastestRide}
            value={
              snapshot.fastestRide
                ? formatSpeed(snapshot.fastestRide.summary.avgSpeedMetersPerSecond)
                : "n/a"
            }
            detail={
              snapshot.fastestRide
                ? formatDistance(snapshot.fastestRide.summary.totalDistanceMeters)
                : ""
            }
            onSelect={onSelect}
          />
          <SnapshotRideButton
            label="Most climbing"
            activity={snapshot.biggestClimb}
            value={
              snapshot.biggestClimb
                ? formatElevation(snapshot.biggestClimb.summary.totalAscentMeters)
                : "n/a"
            }
            detail={
              snapshot.biggestClimb ? formatDate(snapshot.biggestClimb.summary.startTime) : ""
            }
            onSelect={onSelect}
          />
          <SnapshotRideButton
            label="Latest ride"
            activity={snapshot.latestRide}
            value={
              snapshot.latestRide
                ? formatDistance(snapshot.latestRide.summary.totalDistanceMeters)
                : "n/a"
            }
            detail={
              snapshot.latestRide ? formatDateTime(snapshot.latestRide.summary.startTime) : ""
            }
            onSelect={onSelect}
          />
        </div>

        <div className="grid gap-3 p-4">
          <DetailRow
            label="Recent distance"
            value={formatDistance(snapshot.recentDistanceMeters)}
          />
          <DetailRow
            label="Previous distance"
            value={formatDistance(snapshot.previousDistanceMeters)}
          />
          <DetailRow
            label="Distance delta"
            value={formatDeltaDistance(snapshot.distanceDeltaMeters)}
          />
          <DetailRow
            label="Recent average"
            value={formatSpeed(snapshot.recentAvgSpeedMetersPerSecond)}
          />
          <DetailRow
            label="Previous average"
            value={formatSpeed(snapshot.previousAvgSpeedMetersPerSecond)}
          />
          <DetailRow
            label="Speed delta"
            value={formatDeltaSpeed(snapshot.speedDeltaMetersPerSecond)}
          />
        </div>
      </div>
    </section>
  );
}

function SnapshotRideButton({
  label,
  activity,
  value,
  detail,
  onSelect,
}: {
  readonly label: string;
  readonly activity: ActivityListItem | null;
  readonly value: string;
  readonly detail: string;
  readonly onSelect: (activityId: string) => void;
}) {
  const disabled = activity === null;

  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "min-h-28 bg-card px-4 py-3 text-left transition-colors",
        disabled ? "cursor-default text-muted-foreground" : "hover:bg-muted",
      ].join(" ")}
      onClick={() => {
        if (activity) {
          onSelect(activity.id);
        }
      }}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="mt-2 truncate text-xs text-muted-foreground">
        {activity ? `${formatRideTitle(activity)} · ${detail}` : "No ride"}
      </div>
    </button>
  );
}

function RideDetailPanel({
  activity,
  detail,
  loading,
  error,
}: {
  readonly activity: ActivityListItem | null;
  readonly detail: ActivityDetailResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
}) {
  if (activity === null) {
    return (
      <div className="border bg-card p-6 text-sm text-muted-foreground">
        Select a ride to inspect its data.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDaysIcon className="size-4 text-sky-500" />
              <span>{formatDateTime(activity.summary.startTime)}</span>
            </div>
            <h2 className="mt-1 truncate text-xl font-semibold">{formatRideTitle(activity)}</h2>
            <div className="mt-1 truncate text-xs text-muted-foreground">{activity.filename}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right text-xs sm:min-w-64">
            <MiniStat label="Records" value={String(activity.summary.recordCount)} />
            <MiniStat label="Laps" value={String(activity.summary.lapCount)} />
            <MiniStat
              label="Sport"
              value={activity.summary.subSport ?? activity.summary.sport ?? "Ride"}
            />
          </div>
        </div>

        {error ? <StatusMessage tone="error" message={error} /> : null}

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={<RouteIcon className="size-4 text-sky-500" />}
            label="Distance"
            value={formatDistance(activity.summary.totalDistanceMeters)}
            detail={`${formatDuration(activity.summary.totalMovingSeconds)} moving`}
          />
          <MetricTile
            icon={<GaugeIcon className="size-4 text-emerald-500" />}
            label="Speed"
            value={formatSpeed(activity.summary.avgSpeedMetersPerSecond)}
            detail={`${formatSpeed(activity.summary.maxSpeedMetersPerSecond)} max`}
          />
          <MetricTile
            icon={<HeartPulseIcon className="size-4 text-rose-500" />}
            label="Heart rate"
            value={formatBpm(activity.summary.avgHeartRateBpm)}
            detail={`${formatBpm(activity.summary.maxHeartRateBpm)} max`}
          />
          <MetricTile
            icon={<MountainIcon className="size-4 text-amber-500" />}
            label="Climbing"
            value={formatElevation(activity.summary.totalAscentMeters)}
            detail={`${formatCalories(activity.summary.calories)} burned`}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <RouteMap records={detail?.records ?? []} loading={loading} />
        <RideBreakdown summary={activity.summary} laps={detail?.laps ?? []} loading={loading} />
      </section>

      <section className="border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-medium">Profiles</div>
          <div className="text-xs text-muted-foreground">
            {loading ? "Loading" : `${detail?.records.length ?? 0} points`}
          </div>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <ProfileChart
            label="Speed"
            records={detail?.records ?? []}
            getValue={(record) =>
              record.speedMetersPerSecond === null ? null : record.speedMetersPerSecond * 3.6
            }
            formatValue={(value) => `${value.toFixed(1)} km/h`}
            strokeClassName="stroke-sky-500"
          />
          <ProfileChart
            label="Elevation"
            records={detail?.records ?? []}
            getValue={(record) => record.altitudeMeters}
            formatValue={(value) => `${Math.round(value)} m`}
            strokeClassName="stroke-emerald-500"
          />
          <ProfileChart
            label="Heart rate"
            records={detail?.records ?? []}
            getValue={(record) => record.heartRateBpm}
            formatValue={(value) => `${Math.round(value)} bpm`}
            strokeClassName="stroke-rose-500"
          />
        </div>
      </section>
    </div>
  );
}

function RouteMap({
  records,
  loading,
}: {
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly loading: boolean;
}) {
  const points = useMemo(() => projectRoutePoints(records), [records]);
  const hasRoute = points.length >= 2;
  const polyline = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const start = points[0];
  const end = points.at(-1);

  return (
    <section className="border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapIcon className="size-4 text-emerald-500" />
          Route
        </div>
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading" : `${points.length} GPS points`}
        </div>
      </div>
      <div className="aspect-[16/10] min-h-72 p-3">
        {hasRoute ? (
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label="Ride route"
            className="h-full w-full border bg-background"
          >
            <defs>
              <pattern id="route-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  className="stroke-border"
                  strokeWidth="0.3"
                  fill="none"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#route-grid)" />
            <polyline
              points={polyline}
              fill="none"
              className="stroke-emerald-500"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {start ? <circle cx={start.x} cy={start.y} r="1.8" className="fill-sky-500" /> : null}
            {end ? <circle cx={end.x} cy={end.y} r="1.8" className="fill-rose-500" /> : null}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center border bg-background px-4 text-center text-sm text-muted-foreground">
            No GPS route points found for this ride.
          </div>
        )}
      </div>
    </section>
  );
}

function RideBreakdown({
  summary,
  laps,
  loading,
}: {
  readonly summary: ActivityListItem["summary"];
  readonly laps: ReadonlyArray<ActivityLap>;
  readonly loading: boolean;
}) {
  return (
    <section className="border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-medium">Breakdown</div>
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading" : `${laps.length} laps`}
        </div>
      </div>
      <div className="grid gap-3 p-4 text-sm">
        <DetailRow label="Elapsed" value={formatDuration(summary.totalElapsedSeconds)} />
        <DetailRow label="Timer" value={formatDuration(summary.totalTimerSeconds)} />
        <DetailRow label="Moving" value={formatDuration(summary.totalMovingSeconds)} />
        <DetailRow
          label="Power"
          value={`${formatWatts(summary.avgPowerWatts)} avg / ${formatWatts(summary.maxPowerWatts)} max`}
        />
        <DetailRow label="Cadence" value={formatCadence(summary.avgCadenceRpm)} />
        <DetailRow label="GPS" value={summary.hasGps ? "Available" : "Missing"} />
      </div>
      {laps.length > 0 ? (
        <div className="border-t">
          {laps.slice(0, 6).map((lap) => (
            <div
              key={lap.lapIndex}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-3 text-xs last:border-b-0"
            >
              <div className="font-medium">Lap {lap.lapIndex + 1}</div>
              <div className="text-muted-foreground">
                {formatDistance(lap.totalDistanceMeters)} · {formatDuration(lap.totalTimerSeconds)}
              </div>
              <div>{formatSpeed(lap.avgSpeedMetersPerSecond)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProfileChart({
  label,
  records,
  getValue,
  formatValue,
  strokeClassName,
}: {
  readonly label: string;
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly getValue: (record: ActivityRecord) => number | null;
  readonly formatValue: (value: number) => string;
  readonly strokeClassName: string;
}) {
  const values = records
    .map(getValue)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const path = makeProfilePath(values);
  const lastValue = values.at(-1);
  const maxValue = values.length > 0 ? Math.max(...values) : null;

  return (
    <div className="border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-xs">
          {lastValue === undefined ? "No data" : formatValue(lastValue)}
        </div>
      </div>
      <svg
        viewBox="0 0 120 44"
        className="mt-3 h-24 w-full"
        role="img"
        aria-label={`${label} profile`}
      >
        <path d="M0 42H120" className="stroke-border" strokeWidth="1" />
        {path ? (
          <path
            d={path}
            fill="none"
            className={strokeClassName}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <div className="text-xs text-muted-foreground">
        Max {maxValue === null ? "n/a" : formatValue(maxValue)}
      </div>
    </div>
  );
}

function YearProgress({ activities }: { readonly activities: ReadonlyArray<ActivityListItem> }) {
  const months = useMemo(() => {
    const totals = Array.from({ length: 12 }, (_, month) => ({ month, distanceMeters: 0 }));
    for (const activity of activities) {
      const date = parseIsoDate(activity.summary.startTime);
      if (date) {
        totals[date.getMonth()]!.distanceMeters += activity.summary.totalDistanceMeters ?? 0;
      }
    }
    return totals;
  }, [activities]);
  const maxDistance = Math.max(1, ...months.map((month) => month.distanceMeters));

  return (
    <section className="border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-medium">Year progress</div>
        <div className="text-xs text-muted-foreground">
          {formatDistance(months.reduce((sum, month) => sum + month.distanceMeters, 0))}
        </div>
      </div>
      <div className="grid grid-cols-12 items-end gap-2 px-4 py-4">
        {months.map((month) => {
          const height = Math.max(4, Math.round((month.distanceMeters / maxDistance) * 96));
          return (
            <div key={month.month} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end border bg-background">
                <div
                  className="w-full bg-emerald-500/80"
                  style={{ height }}
                  title={formatDistance(month.distanceMeters)}
                />
              </div>
              <div className="text-[0.65rem] text-muted-foreground">
                {MONTH_LABELS[month.month]}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricTile({
  icon,
  label,
  value,
  detail,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className="border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StatusMessage({
  tone,
  message,
}: {
  readonly tone: "error" | "info";
  readonly message: string;
}) {
  return (
    <div
      className={[
        "border px-3 py-2 text-sm",
        tone === "error" ? "border-destructive/40 text-destructive" : "text-muted-foreground",
      ].join(" ")}
    >
      {message}
    </div>
  );
}

function EmptyRideState({ onUpload }: { readonly onUpload: () => void }) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center border bg-card p-8 text-center">
      <BikeIcon className="size-8 text-emerald-500" />
      <div className="mt-4 text-lg font-semibold">No rides yet</div>
      <div className="mt-2 max-w-sm text-sm text-muted-foreground">
        Upload a FIT activity to start building the dashboard.
      </div>
      <Button type="button" className="mt-5" onClick={onUpload}>
        <FileUpIcon data-icon="inline-start" />
        Upload FIT
      </Button>
    </div>
  );
}

async function requestJson<A>(url: string, init?: RequestInit): Promise<A> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }
  return (await response.json()) as A;
}

async function uploadFitFile(file: File): Promise<FitImportResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  return requestJson<FitImportResponse>("/api/activities/import", {
    method: "POST",
    body: form,
  });
}

function formatUploadProgress(
  progress: {
    readonly current: number;
    readonly total: number;
  } | null,
): string {
  return progress ? `Importing ${progress.current}/${progress.total}` : "Importing";
}

function formatImportFailures(failures: ReadonlyArray<string>, total: number): string {
  const shown = failures.slice(0, 2).join(" ");
  const hiddenCount = failures.length - 2;
  const hidden = hiddenCount > 0 ? ` ${hiddenCount} more failed.` : "";
  return `${failures.length} of ${total} FIT files could not be imported. ${shown}${hidden}`;
}

function summarizeActivities(activities: ReadonlyArray<ActivityListItem>) {
  const distanceMeters = activities.reduce(
    (sum, activity) => sum + (activity.summary.totalDistanceMeters ?? 0),
    0,
  );
  const movingSeconds = activities.reduce(
    (sum, activity) => sum + (activity.summary.totalMovingSeconds ?? 0),
    0,
  );
  const elapsedSeconds = activities.reduce(
    (sum, activity) => sum + (activity.summary.totalElapsedSeconds ?? 0),
    0,
  );
  const ascentMeters = activities.reduce(
    (sum, activity) => sum + (activity.summary.totalAscentMeters ?? 0),
    0,
  );
  const descentMeters = activities.reduce(
    (sum, activity) => sum + (activity.summary.totalDescentMeters ?? 0),
    0,
  );

  return {
    rideCount: activities.length,
    distanceMeters,
    movingSeconds,
    elapsedSeconds,
    ascentMeters,
    descentMeters,
    avgSpeedMetersPerSecond: movingSeconds > 0 ? distanceMeters / movingSeconds : null,
  };
}

function summarizeSeason(activities: ReadonlyArray<ActivityListItem>) {
  const ordered = [...activities].sort((a, b) => {
    const aTime = parseIsoDate(a.summary.startTime)?.getTime() ?? 0;
    const bTime = parseIsoDate(b.summary.startTime)?.getTime() ?? 0;
    return bTime - aTime;
  });
  const activeMonths = new Set(
    ordered
      .map((activity) => parseIsoDate(activity.summary.startTime))
      .filter((date): date is Date => date !== null)
      .map((date) => `${date.getFullYear()}-${date.getMonth()}`),
  ).size;
  const recent = ordered.slice(0, 4);
  const previous = ordered.slice(4, 8);
  const recentDistanceMeters = sumDistance(recent);
  const previousDistanceMeters = previous.length > 0 ? sumDistance(previous) : null;
  const recentAvgSpeedMetersPerSecond = weightedAverageSpeed(recent);
  const previousAvgSpeedMetersPerSecond =
    previous.length > 0 ? weightedAverageSpeed(previous) : null;

  return {
    activeMonths,
    latestRide: ordered[0] ?? null,
    longestRide: maxBy(ordered, (activity) => activity.summary.totalDistanceMeters),
    fastestRide: maxBy(ordered, (activity) => activity.summary.avgSpeedMetersPerSecond),
    biggestClimb: maxBy(ordered, (activity) => activity.summary.totalAscentMeters),
    recentDistanceMeters,
    previousDistanceMeters,
    distanceDeltaMeters:
      previousDistanceMeters === null ? null : recentDistanceMeters - previousDistanceMeters,
    recentAvgSpeedMetersPerSecond,
    previousAvgSpeedMetersPerSecond,
    speedDeltaMetersPerSecond:
      previousAvgSpeedMetersPerSecond === null || recentAvgSpeedMetersPerSecond === null
        ? null
        : recentAvgSpeedMetersPerSecond - previousAvgSpeedMetersPerSecond,
  };
}

function maxBy(
  activities: ReadonlyArray<ActivityListItem>,
  getValue: (activity: ActivityListItem) => number | null,
): ActivityListItem | null {
  let best: ActivityListItem | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const activity of activities) {
    const value = getValue(activity);
    if (value !== null && Number.isFinite(value) && value > bestValue) {
      best = activity;
      bestValue = value;
    }
  }

  return best;
}

function sumDistance(activities: ReadonlyArray<ActivityListItem>): number {
  return activities.reduce((sum, activity) => sum + (activity.summary.totalDistanceMeters ?? 0), 0);
}

function weightedAverageSpeed(activities: ReadonlyArray<ActivityListItem>): number | null {
  const movingSeconds = activities.reduce(
    (sum, activity) => sum + (activity.summary.totalMovingSeconds ?? 0),
    0,
  );

  return movingSeconds > 0 ? sumDistance(activities) / movingSeconds : null;
}

function projectRoutePoints(records: ReadonlyArray<ActivityRecord>) {
  const gps = records.filter(
    (record) =>
      typeof record.latitude === "number" &&
      typeof record.longitude === "number" &&
      Number.isFinite(record.latitude) &&
      Number.isFinite(record.longitude),
  );
  if (gps.length < 2) {
    return [];
  }

  const latitudes = gps.map((record) => record.latitude!);
  const longitudes = gps.map((record) => record.longitude!);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.00001);
  const lonRange = Math.max(maxLon - minLon, 0.00001);
  const padding = 6;
  const size = 100 - padding * 2;

  return gps.map((record) => ({
    x: padding + ((record.longitude! - minLon) / lonRange) * size,
    y: padding + (1 - (record.latitude! - minLat) / latRange) * size,
  }));
}

function makeProfilePath(values: ReadonlyArray<number>): string | null {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.00001);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 120;
      const y = 40 - ((value - min) / range) * 36;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatRideTitle(activity: ActivityListItem): string {
  const date = parseIsoDate(activity.summary.startTime);
  if (date === null) {
    return "Untitled ride";
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string | null): string {
  const date = parseIsoDate(value);
  if (date === null) {
    return "n/a";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatDateTime(value: string | null): string {
  const date = parseIsoDate(value);
  if (date === null) {
    return "Date unavailable";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} km`;
}

function formatDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${(value * 3.6).toFixed(1)} km/h`;
}

function formatDeltaDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatDistance(value)}`;
}

function formatDeltaSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatSpeed(value)}`;
}

function formatElevation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} m`;
}

function formatBpm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} bpm`;
}

function formatWatts(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} W`;
}

function formatCadence(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} rpm`;
}

function formatCalories(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} kcal`;
}

function parseIsoDate(value: string | null): Date | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function errorToMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}
