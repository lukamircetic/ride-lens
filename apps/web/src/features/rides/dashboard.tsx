import type {
  ActivityDetailResponse,
  ActivityListResponse,
  FitImportResponse,
} from "@ride-lens/api";
import { useNavigate } from "@tanstack/react-router";
import { FileUpIcon, RefreshCwIcon } from "lucide-react";
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

/**
 * Ride Lens — live dashboard, styled in the "tarmac" language of the /3
 * prototype: asphalt palette, road-paint white, traffic-yellow trace, a
 * MUTCD green gantry for season totals, and chart panels framed like
 * survey figures. Real API only; no mock data.
 */

const CSS = `
[data-app="ride-lens"]{
  --night:#1b1d21;
  --night-2:#23262c;
  --abyss:#15181e;
  --ink:#f2efe6;
  --ink-2:#bdb9ad;
  --ink-3:#7d7a70;
  --line:#3a3f47;
  --line-2:#2a2d33;
  --amber:#ffc72c;
  --amber-2:#ffd95f;
  --amber-deep:#9c7a12;
  --sign-green:#0b5138;
  --sign-green-edge:#0a3f2c;
  background:var(--night);
  color:var(--ink);
  font-family:"Overpass",system-ui,sans-serif;
  font-feature-settings:"tnum" 1;
  -webkit-font-smoothing:antialiased;
  min-height:100svh;
}
[data-app="ride-lens"] *{box-sizing:border-box}
[data-app="ride-lens"] .mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
[data-app="ride-lens"] .wrap{max-width:1240px;margin:0 auto;padding:0 28px 60px}

/* road-line header */
[data-app="ride-lens"] .road-header{padding:26px 0 22px}
[data-app="ride-lens"] .road-header .rh-row{display:flex;align-items:center;gap:22px}
[data-app="ride-lens"] .rh-title{font-family:"Overpass",sans-serif;font-weight:900;font-size:30px;line-height:1;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);text-decoration:none;white-space:nowrap}
[data-app="ride-lens"] .rh-line{flex:1;height:3px;background:repeating-linear-gradient(90deg,var(--amber) 0 26px,transparent 26px 44px);transform:translateY(-2px)}
[data-app="ride-lens"] .rh-actions{display:flex;gap:8px;white-space:nowrap}
[data-app="ride-lens"] .rh-btn{display:inline-flex;align-items:center;gap:8px;font-family:"Overpass",sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);background:var(--night-2);border:1px solid var(--line);padding:9px 14px;cursor:pointer;transition:color .15s,border-color .15s}
[data-app="ride-lens"] .rh-btn:hover{color:var(--amber);border-color:var(--amber)}
[data-app="ride-lens"] .rh-btn:disabled{opacity:.5;cursor:default}
[data-app="ride-lens"] .rh-btn svg{width:15px;height:15px}

/* status messages */
[data-app="ride-lens"] .status{margin-top:18px;border:1px solid var(--line);border-left:3px solid var(--amber);padding:12px 14px;font-size:14px;color:var(--ink-2)}
[data-app="ride-lens"] .status.error{border-left-color:#c8362c;color:#e6a59d}

/* green gantry */
[data-app="ride-lens"] .gantry{margin-top:26px;background:var(--sign-green);color:#fff;border:4px solid #fff;box-shadow:0 0 0 4px var(--sign-green-edge),0 22px 50px rgba(0,0,0,.45);border-radius:8px;overflow:hidden}
[data-app="ride-lens"] .gantry-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;padding:15px 24px;border-top:2px solid rgba(255,255,255,.85)}
[data-app="ride-lens"] .gantry-row:first-child{border-top:0}
[data-app="ride-lens"] .gantry-dest{display:flex;align-items:center;gap:14px;font-family:"Overpass",sans-serif;font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
[data-app="ride-lens"] .gantry-dest .arrow{opacity:.9}
[data-app="ride-lens"] .gantry-val{font-family:"Overpass Mono",monospace;font-weight:800;font-size:26px;letter-spacing:.01em;white-space:nowrap}
[data-app="ride-lens"] .gantry-val small{font-size:.5em;font-weight:600;opacity:.8;margin-left:6px}

/* sections */
[data-app="ride-lens"] .section{margin-top:48px}
[data-app="ride-lens"] .sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:20px;flex-wrap:wrap}
[data-app="ride-lens"] .sec-title{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-2)}
[data-app="ride-lens"] .sec-title b{color:var(--amber)}
[data-app="ride-lens"] .sec-sub{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.06em}

/* chart frame */
[data-app="ride-lens"] .chart{position:relative;border:1px solid var(--line);background:var(--abyss);padding:14px}
[data-app="ride-lens"] .chart .corner{position:absolute;width:14px;height:14px;border:1px solid var(--amber);opacity:.7}
[data-app="ride-lens"] .chart .corner.tl{top:-1px;left:-1px;border-right:0;border-bottom:0}
[data-app="ride-lens"] .chart .corner.tr{top:-1px;right:-1px;border-left:0;border-bottom:0}
[data-app="ride-lens"] .chart .corner.bl{bottom:-1px;left:-1px;border-right:0;border-top:0}
[data-app="ride-lens"] .chart .corner.br{bottom:-1px;right:-1px;border-left:0;border-top:0}
[data-app="ride-lens"] .chart .cap{display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}

/* aux sign tiles */
[data-app="ride-lens"] .signs{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
[data-app="ride-lens"] .sign{background:var(--night-2);border:1px solid var(--line);border-radius:6px;padding:16px}
[data-app="ride-lens"] .sign .lbl{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
[data-app="ride-lens"] .sign .num{font-family:"Overpass Mono",monospace;font-weight:800;font-size:26px;margin-top:8px;line-height:1;letter-spacing:.01em;color:var(--ink)}
[data-app="ride-lens"] .sign .num small{font-size:.46em;color:var(--ink-2);font-weight:600;margin-left:5px}
[data-app="ride-lens"] .sign .cap{margin-top:10px;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink-3)}
[data-app="ride-lens"] .sign.accent{border-color:var(--amber)}
[data-app="ride-lens"] .sign.accent .num{color:var(--amber)}
[data-app="ride-lens"] .sign.clickable{cursor:pointer;transition:border-color .15s,background .15s}
[data-app="ride-lens"] .sign.clickable:hover{background:var(--abyss);border-color:var(--amber)}

/* ride table */
[data-app="ride-lens"] .ride-table{width:100%;border-collapse:collapse;font-family:"IBM Plex Mono",monospace;font-size:13px}
[data-app="ride-lens"] .ride-table th{text-align:left;font-weight:500;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;font-size:10px;padding:11px 12px;border-bottom:1px solid var(--line)}
[data-app="ride-lens"] .ride-table td{padding:12px;border-bottom:1px solid var(--line-2);color:var(--ink-2)}
[data-app="ride-lens"] .ride-table td.name{color:var(--ink)}
[data-app="ride-lens"] .ride-table td.amber{color:var(--amber-2)}
[data-app="ride-lens"] .ride-table tbody tr{cursor:pointer;transition:background .12s}
[data-app="ride-lens"] .ride-table tbody tr:hover td{background:rgba(255,199,44,.06)}
[data-app="ride-lens"] .ride-table tbody tr.selected td{background:rgba(255,199,44,.1);border-bottom-color:var(--amber)}
[data-app="ride-lens"] .ride-table th.r,
[data-app="ride-lens"] .ride-table td.r{text-align:right}

/* detail */
[data-app="ride-lens"] .detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:16px}
[data-app="ride-lens"] .detail-head .name{font-family:"Overpass",sans-serif;font-weight:800;font-size:22px;letter-spacing:.01em;text-transform:uppercase;line-height:1.1}
[data-app="ride-lens"] .detail-head .when{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--ink-3);margin-top:5px;letter-spacing:.04em}
[data-app="ride-lens"] .detail-head .mini{display:flex;gap:14px;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase}
[data-app="ride-lens"] .detail-head .mini b{color:var(--ink);font-weight:600;margin-left:5px}

[data-app="ride-lens"] .map-grid{display:grid;grid-template-columns:1.4fr 0.6fr;gap:0;border:1px solid var(--line);background:var(--abyss)}
[data-app="ride-lens"] .map-stage{padding:14px}
[data-app="ride-lens"] .map-meta{border-left:1px solid var(--line);padding:18px;display:flex;flex-direction:column;gap:12px;background:var(--night-2)}
[data-app="ride-lens"] .map-meta .field{border-top:1px solid var(--line);padding-top:8px}
[data-app="ride-lens"] .map-meta .field:first-child{border-top:0;padding-top:0}
[data-app="ride-lens"] .map-meta .field .k{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
[data-app="ride-lens"] .map-meta .field .v{font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:16px;margin-top:3px}

/* profiles */
[data-app="ride-lens"] .profiles{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--line);border-top:0;background:var(--abyss)}
[data-app="ride-lens"] .profile{padding:16px;border-left:1px solid var(--line)}
[data-app="ride-lens"] .profile:first-child{border-left:0}
[data-app="ride-lens"] .profile .pl{display:flex;justify-content:space-between;align-items:baseline}
[data-app="ride-lens"] .profile .pl span{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
[data-app="ride-lens"] .profile .pl b{font-family:"IBM Plex Mono",monospace;font-size:13px;color:var(--ink)}
[data-app="ride-lens"] .profile .paxis{display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-3);margin-top:6px}

/* breakdown */
[data-app="ride-lens"] .breakdown{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin-top:14px;border:1px solid var(--line);background:var(--abyss)}
[data-app="ride-lens"] .breakdown .b-row{display:flex;justify-content:space-between;padding:11px 14px;border-bottom:1px solid var(--line-2)}
[data-app="ride-lens"] .breakdown .b-row .k{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
[data-app="ride-lens"] .breakdown .b-row .v{font-family:"IBM Plex Mono",monospace;font-size:13px;color:var(--ink)}
[data-app="ride-lens"] .laps{margin-top:14px;border:1px solid var(--line);background:var(--abyss)}
[data-app="ride-lens"] .lap{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:11px 14px;border-bottom:1px solid var(--line-2);font-family:"IBM Plex Mono",monospace;font-size:12px}
[data-app="ride-lens"] .lap:last-child{border-bottom:0}
[data-app="ride-lens"] .lap .n{color:var(--amber);font-weight:600}
[data-app="ride-lens"] .lap .d{color:var(--ink-2)}
[data-app="ride-lens"] .lap .s{color:var(--ink)}

/* season snapshot */
[data-app="ride-lens"] .snapshot{display:grid;grid-template-columns:minmax(240px,.68fr) 1fr;gap:14px;align-items:stretch}
[data-app="ride-lens"] .snapshot .gantry{margin-top:0;min-height:100%;display:flex;flex-direction:column;box-shadow:0 14px 32px rgba(0,0,0,.34);border-width:3px}
[data-app="ride-lens"] .snapshot .gantry-row{flex:1;padding:11px 14px;gap:12px}
[data-app="ride-lens"] .snapshot .gantry-dest{gap:8px;font-size:11px;letter-spacing:.06em}
[data-app="ride-lens"] .snapshot .gantry-val{font-size:18px}
[data-app="ride-lens"] .snapshot .gantry-val small{font-size:.52em;margin-left:4px}
[data-app="ride-lens"] .snapshot .bests{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--line);background:var(--abyss)}
[data-app="ride-lens"] .snapshot .bests .sign{border:0;background:transparent;border-right:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
[data-app="ride-lens"] .snapshot .bests .sign:nth-child(2n){border-right:0}
[data-app="ride-lens"] .snapshot .bests .sign:nth-last-child(-n+2){border-bottom:0}

/* recent comparison */
[data-app="ride-lens"] .delta-panel{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);background:var(--abyss)}
[data-app="ride-lens"] .delta-panel .drow{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 16px;border-right:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
[data-app="ride-lens"] .delta-panel .drow:nth-child(3n){border-right:0}
[data-app="ride-lens"] .delta-panel .drow:nth-last-child(-n+3){border-bottom:0}
[data-app="ride-lens"] .delta-panel .drow .k{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
[data-app="ride-lens"] .delta-panel .drow .v{font-family:"IBM Plex Mono",monospace;font-size:13px;color:var(--ink)}
[data-app="ride-lens"] .delta-panel .drow .v.up{color:var(--amber)}

/* year progress */
[data-app="ride-lens"] .months{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}
[data-app="ride-lens"] .month{display:flex;flex-direction:column;gap:7px}
[data-app="ride-lens"] .month .track{height:120px;background:var(--night-2);border:1px solid var(--line-2);display:flex;align-items:flex-end;padding:5px}
[data-app="ride-lens"] .month .bar{width:100%;background:repeating-linear-gradient(180deg,var(--amber) 0 9px,var(--night) 9px 11px)}
[data-app="ride-lens"] .month .ml{display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-3)}
[data-app="ride-lens"] .month .ml b{color:var(--ink)}

/* empty state */
[data-app="ride-lens"] .empty{margin-top:26px;border:1px solid var(--line);background:var(--abyss);padding:64px 24px;text-align:center}
[data-app="ride-lens"] .empty .glyph{font-family:"Overpass",sans-serif;font-weight:900;font-size:40px;color:var(--amber);letter-spacing:.04em}
[data-app="ride-lens"] .empty .t{margin-top:14px;font-family:"Overpass",sans-serif;font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:.02em}
[data-app="ride-lens"] .empty .d{margin-top:8px;font-family:"IBM Plex Mono",monospace;font-size:13px;color:var(--ink-3);max-width:36ch;margin-left:auto;margin-right:auto}
[data-app="ride-lens"] .empty .rh-btn{margin-top:20px}

[data-app="ride-lens"] footer{margin-top:48px;padding-top:18px;border-top:1px solid var(--line-2);display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}

@media (max-width:900px){
  [data-app="ride-lens"] .signs{grid-template-columns:repeat(2,1fr)}
  [data-app="ride-lens"] .map-grid{grid-template-columns:1fr}
  [data-app="ride-lens"] .map-meta{border-left:0;border-top:1px solid var(--line)}
  [data-app="ride-lens"] .profiles{grid-template-columns:1fr}
  [data-app="ride-lens"] .profile{border-left:0;border-top:1px solid var(--line)}
  [data-app="ride-lens"] .profile:first-child{border-top:0}
  [data-app="ride-lens"] .breakdown{grid-template-columns:1fr}
  [data-app="ride-lens"] .snapshot{grid-template-columns:1fr}
  [data-app="ride-lens"] .delta-panel{grid-template-columns:1fr}
  [data-app="ride-lens"] .delta-panel .drow{border-right:0}
  [data-app="ride-lens"] .delta-panel .drow:nth-last-child(-n+3){border-bottom:1px solid var(--line-2)}
  [data-app="ride-lens"] .delta-panel .drow:last-child{border-bottom:0}
  [data-app="ride-lens"] .months{grid-template-columns:repeat(6,1fr)}
}
@media (prefers-reduced-motion:reduce){[data-app="ride-lens"] *{animation:none!important;transition:none!important}}
`;

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
  const [uploadProgress, setUploadProgress] = useState<{ readonly current: number; readonly total: number } | null>(
    null,
  );
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
        list.activities.find((activity) => activity.id === preferredId) ?? list.activities[0] ?? null;
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
        if (!cancelled) setDetailState({ data: detail, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setDetailState({ data: null, error: errorToMessage(error, "Could not load ride details."), loading: false });
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
          const imported = await uploadFitFile(file);
          importedIds.push(imported.importId);
        } catch (error) {
          failures.push(`${file.name}: ${errorToMessage(error, "Import failed.")}`);
        }
      }
      const selectedImportId = importedIds.at(-1);
      if (selectedImportId) {
        await loadActivities(selectedImportId);
        await navigate({ to: "/rides/$activityId", params: { activityId: selectedImportId } });
      }
      if (failures.length > 0) setUploadError(formatImportFailures(failures, uploadFiles.length));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectActivity = (activityId: string) => {
    setSelectedActivityId(activityId);
    void navigate({ to: "/rides/$activityId", params: { activityId } });
  };

  const totals = useMemo(() => summarizeActivities(activities), [activities]);
  const snapshot = useMemo(() => summarizeSeason(activities), [activities]);

  return (
    <div data-app="ride-lens">
      <style>{CSS}</style>
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
              <button
                type="button"
                className="rh-btn"
                disabled={activitiesState.loading}
                onClick={() => void loadActivities()}
              >
                <RefreshCwIcon />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {uploadError ? <div className="status error">{uploadError}</div> : null}
        {activitiesState.error ? <div className="status error">{activitiesState.error}</div> : null}

        {/* RIDE TABLE */}
        {activities.length === 0 && !activitiesState.loading ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <section className="section">
            <div className="sec-head">
              <div className="sec-title">
                <b>▲</b> Ride log
              </div>
              <div className="sec-sub">{activitiesState.loading ? "loading" : `${activities.length} rides`}</div>
            </div>
            <table className="ride-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ride</th>
                  <th>Date</th>
                  <th className="r">Dist</th>
                  <th className="r">Time</th>
                  <th className="r">Avg</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, i) => (
                  <tr
                    key={activity.id}
                    className={selectedActivityId === activity.id ? "selected" : ""}
                    onClick={() => handleSelectActivity(activity.id)}
                  >
                    <td>{String(i + 1).padStart(2, "0")}</td>
                    <td className="name">{formatRideTitle(activity)}</td>
                    <td>{formatDate(activity.summary.startTime)}</td>
                    <td className="r amber">{formatDistance(activity.summary.totalDistanceMeters)}</td>
                    <td className="r">{formatDuration(activity.summary.totalMovingSeconds)}</td>
                    <td className="r">{formatSpeed(activity.summary.avgSpeedMetersPerSecond)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* SELECTED RIDE DETAIL */}
        {selectedActivity ? (
          <section className="section">
            <div className="sec-head">
              <div className="sec-title">
                <b>▲</b> Selected ride
              </div>
              <div className="sec-sub">{detailState.loading ? "loading detail" : `${detailState.data?.records.length ?? 0} records`}</div>
            </div>
            <RideDetail
              activity={selectedActivity}
              detail={detailState.data}
              loading={detailState.loading}
              error={detailState.error}
            />
          </section>
        ) : null}

        {/* SEASON SNAPSHOT */}
        {snapshot ? (
          <section className="section">
            <div className="sec-head">
              <div className="sec-title">
                <b>▲</b> Season snapshot
              </div>
              <div className="sec-sub">{snapshot.activeMonths} active {snapshot.activeMonths === 1 ? "month" : "months"}</div>
            </div>
            <SeasonSnapshot snapshot={snapshot} totals={totals} onSelect={handleSelectActivity} />
          </section>
        ) : null}

        {/* RECENT COMPARISON */}
        {snapshot ? (
          <section className="section">
            <div className="sec-head">
              <div className="sec-title">
                <b>▲</b> Recent vs previous
              </div>
              <div className="sec-sub">last 4 rides vs previous 4</div>
            </div>
            <RecentComparison snapshot={snapshot} />
          </section>
        ) : null}

        {/* YEAR PROGRESS */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              <b>▲</b> Year progress
            </div>
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

function GantryRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="gantry-row">
      <div className="gantry-dest">
        <span className="arrow" aria-hidden="true">
          ▲
        </span>
        <span>{label}</span>
      </div>
      <div className="gantry-val">
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
    </div>
  );
}

function RideDetail({
  activity,
  detail,
  loading,
  error,
}: {
  readonly activity: ActivityListItem;
  readonly detail: ActivityDetailResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
}) {
  const records = detail?.records ?? [];
  return (
    <div>
      <div className="detail-head">
        <div>
          <div className="name">{formatRideTitle(activity)}</div>
          <div className="when">
            {formatDateTime(activity.summary.startTime)} · {activity.filename}
          </div>
        </div>
        <div className="mini">
          <span>
            Records<b>{activity.summary.recordCount}</b>
          </span>
          <span>
            Laps<b>{activity.summary.lapCount}</b>
          </span>
          <span>
            Type<b>{activity.summary.subSport ?? activity.summary.sport ?? "ride"}</b>
          </span>
        </div>
      </div>

      {error ? <div className="status error">{error}</div> : null}

      <div className="signs" style={{ marginTop: 4 }}>
        <Sign label="Distance" value={formatDistance(activity.summary.totalDistanceMeters)} cap={`${formatDuration(activity.summary.totalMovingSeconds)} moving`} accent />
        <Sign label="Speed" value={formatSpeed(activity.summary.avgSpeedMetersPerSecond)} cap={`${formatSpeed(activity.summary.maxSpeedMetersPerSecond)} max`} />
        <Sign label="Heart rate" value={formatBpm(activity.summary.avgHeartRateBpm)} cap={`${formatBpm(activity.summary.maxHeartRateBpm)} max`} />
        <Sign label="Climbing" value={formatElevation(activity.summary.totalAscentMeters)} cap={`${formatCalories(activity.summary.calories)} burned`} />
      </div>

      <div className="map-grid" style={{ marginTop: 14 }}>
        <RouteMap records={records} loading={loading} />
        <div className="map-meta">
          <Field k="Avg power" v={`${formatWatts(activity.summary.avgPowerWatts)} / ${formatWatts(activity.summary.maxPowerWatts)} max`} />
          <Field k="Cadence" v={formatCadence(activity.summary.avgCadenceRpm)} />
          <Field k="Descent" v={formatElevation(activity.summary.totalDescentMeters)} />
          <Field k="GPS" v={activity.summary.hasGps ? "available" : "missing"} />
        </div>
      </div>

      <div className="profiles" style={{ marginTop: 0, borderTop: 0 }}>
        <ProfilePanel
          label="Speed"
          records={records}
          getValue={(r) => (r.speedMetersPerSecond === null ? null : r.speedMetersPerSecond * 3.6)}
          format={(v) => `${v.toFixed(1)} km/h`}
          fill="#ffc72c"
          stroke="#ffd95f"
        />
        <ProfilePanel
          label="Elevation"
          records={records}
          getValue={(r) => r.altitudeMeters}
          format={(v) => `${Math.round(v)} m`}
          fill="#ffc72c"
          stroke="#ffc72c"
          area
        />
        <ProfilePanel
          label="Heart rate"
          records={records}
          getValue={(r) => r.heartRateBpm}
          format={(v) => `${Math.round(v)} bpm`}
          fill="#9c7a12"
          stroke="#bdb9ad"
        />
      </div>

      <div className="breakdown">
        <div className="b-row">
          <span className="k">Elapsed</span>
          <span className="v">{formatDuration(activity.summary.totalElapsedSeconds)}</span>
        </div>
        <div className="b-row">
          <span className="k">Timer</span>
          <span className="v">{formatDuration(activity.summary.totalTimerSeconds)}</span>
        </div>
        <div className="b-row">
          <span className="k">Moving</span>
          <span className="v">{formatDuration(activity.summary.totalMovingSeconds)}</span>
        </div>
        <div className="b-row">
          <span className="k">Normalized pwr</span>
          <span className="v">{formatWatts(activity.summary.normalizedPowerWatts)}</span>
        </div>
      </div>

      {detail && detail.laps.length > 0 ? (
        <div className="laps">
          {detail.laps.slice(0, 8).map((lap) => (
            <div className="lap" key={lap.lapIndex}>
              <span className="n">Lap {lap.lapIndex + 1}</span>
              <span className="d">
                {formatDistance(lap.totalDistanceMeters)} · {formatDuration(lap.totalTimerSeconds)}
              </span>
              <span className="s">{formatSpeed(lap.avgSpeedMetersPerSecond)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RouteMap({ records, loading }: { readonly records: ReadonlyArray<ActivityRecord>; readonly loading: boolean }) {
  const points = useMemo(() => projectRoutePoints(records), [records]);
  const hasRoute = points.length >= 2;
  const polyline = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const start = points[0];
  const end = points.at(-1);

  return (
    <div className="map-stage">
      <div className="cap">
        <span>Route</span>
        <span>{loading ? "loading" : `${points.length} GPS points`}</span>
      </div>
      {hasRoute ? (
        <svg viewBox="0 0 100 100" role="img" aria-label="Ride route" style={{ width: "100%", height: "auto", display: "block", aspectRatio: "1" }}>
          <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--line-2)" strokeWidth="0.25" />
          </pattern>
          <rect width="100" height="100" fill="url(#map-grid)" />
          <polyline points={polyline} fill="none" stroke="#f2efe6" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
          <polyline points={polyline} fill="none" stroke="#1b1d21" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={polyline} fill="none" stroke="#ffc72c" strokeWidth="0.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="0.5 2" />
          {start ? <circle cx={start.x} cy={start.y} r="1.4" fill="#f2efe6" stroke="#1b1d21" strokeWidth="0.4" /> : null}
          {end ? <circle cx={end.x} cy={end.y} r="1.4" fill="#ffc72c" stroke="#1b1d21" strokeWidth="0.4" /> : null}
        </svg>
      ) : (
        <div style={{ aspectRatio: "1", display: "grid", placeItems: "center", border: "1px solid var(--line)", color: "var(--ink-3)", fontFamily: '"IBM Plex Mono",monospace', fontSize: 12 }}>
          No GPS route for this ride.
        </div>
      )}
    </div>
  );
}

function ProfilePanel({
  label,
  records,
  getValue,
  format: formatValue,
  fill,
  stroke,
  area,
}: {
  readonly label: string;
  readonly records: ReadonlyArray<ActivityRecord>;
  readonly getValue: (record: ActivityRecord) => number | null;
  readonly format: (value: number) => string;
  readonly fill: string;
  readonly stroke: string;
  readonly area?: boolean;
}) {
  const values = useMemo(
    () =>
      records.map(getValue).filter((v): v is number => v !== null && Number.isFinite(v)),
    [records, getValue],
  );
  const last = values.at(-1);
  const max = values.length ? Math.max(...values) : null;
  const path = buildProfilePath(values, 600, 150, 138, 12);
  const areaPath = area ? buildProfileArea(values, 600, 150, 138, 12) : null;

  return (
    <div className="profile">
      <div className="pl">
        <span>{label}</span>
        <b>{last === undefined ? "no data" : formatValue(last)}</b>
      </div>
      <svg viewBox="0 0 600 150" style={{ width: "100%", height: "auto", marginTop: 10, display: "block" }} role="img" aria-label={`${label} profile`}>
        <line x1="0" y1="138" x2="600" y2="138" stroke="var(--line)" strokeWidth="1" />
        {areaPath ? <path d={areaPath} fill={fill} fillOpacity="0.18" /> : null}
        {path ? <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
      </svg>
      <div className="paxis">
        <span>start</span>
        <span>peak {max === null ? "n/a" : formatValue(max)}</span>
      </div>
    </div>
  );
}

function Sign({
  label,
  value,
  cap,
  accent,
  onClick,
}: {
  readonly label: string;
  readonly value: string;
  readonly cap?: string;
  readonly accent?: boolean;
  readonly onClick?: () => void;
}) {
  return (
    <div className={`sign${accent ? " accent" : ""}${onClick ? " clickable" : ""}`} onClick={onClick}>
      <div className="lbl">{label}</div>
      <div className="num">{value}</div>
      {cap ? <div className="cap">{cap}</div> : null}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="field">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function SeasonSnapshot({
  snapshot,
  totals,
  onSelect,
}: {
  readonly snapshot: SeasonSnapshotData;
  readonly totals: SeasonTotals;
  readonly onSelect: (activityId: string) => void;
}) {
  return (
    <div className="snapshot">
      <div className="gantry" role="group" aria-label="Season totals">
        <GantryRow label="Rides logged" value={String(totals.rideCount)} />
        <GantryRow label="Total distance" value={formatDistance(totals.distanceMeters)} />
        <GantryRow label="Moving time" value={formatDuration(totals.movingSeconds)} />
        <GantryRow label="Elevation gained" value={formatElevation(totals.ascentMeters)} unit="m" />
      </div>
      <div className="bests">
        <Sign
          label="Longest ride"
          value={snapshot.longestRide ? formatDistance(snapshot.longestRide.summary.totalDistanceMeters) : "n/a"}
          cap={snapshot.longestRide ? formatDate(snapshot.longestRide.summary.startTime) : undefined}
          accent
          onClick={snapshot.longestRide ? () => onSelect(snapshot.longestRide!.id) : undefined}
        />
        <Sign
          label="Fastest average"
          value={snapshot.fastestRide ? formatSpeed(snapshot.fastestRide.summary.avgSpeedMetersPerSecond) : "n/a"}
          cap={snapshot.fastestRide ? formatDistance(snapshot.fastestRide.summary.totalDistanceMeters) : undefined}
          accent
          onClick={snapshot.fastestRide ? () => onSelect(snapshot.fastestRide!.id) : undefined}
        />
        <Sign
          label="Most climbing"
          value={snapshot.biggestClimb ? formatElevation(snapshot.biggestClimb.summary.totalAscentMeters) : "n/a"}
          cap={snapshot.biggestClimb ? formatDate(snapshot.biggestClimb.summary.startTime) : undefined}
          accent
          onClick={snapshot.biggestClimb ? () => onSelect(snapshot.biggestClimb!.id) : undefined}
        />
        <Sign
          label="Latest ride"
          value={snapshot.latestRide ? formatDistance(snapshot.latestRide.summary.totalDistanceMeters) : "n/a"}
          cap={snapshot.latestRide ? formatDateTime(snapshot.latestRide.summary.startTime) : undefined}
          accent
          onClick={snapshot.latestRide ? () => onSelect(snapshot.latestRide!.id) : undefined}
        />
      </div>
    </div>
  );
}

function RecentComparison({ snapshot }: { readonly snapshot: SeasonSnapshotData }) {
  return (
    <div className="delta-panel">
      <Delta k="Recent distance" v={formatDistance(snapshot.recentDistanceMeters)} />
      <Delta k="Previous distance" v={snapshot.previousDistanceMeters === null ? "n/a" : formatDistance(snapshot.previousDistanceMeters)} />
      <Delta k="Distance delta" v={formatDeltaDistance(snapshot.distanceDeltaMeters)} up={snapshot.distanceDeltaMeters !== null && snapshot.distanceDeltaMeters > 0} />
      <Delta k="Recent average" v={formatSpeed(snapshot.recentAvgSpeedMetersPerSecond)} />
      <Delta k="Previous average" v={snapshot.previousAvgSpeedMetersPerSecond === null ? "n/a" : formatSpeed(snapshot.previousAvgSpeedMetersPerSecond)} />
      <Delta k="Speed delta" v={formatDeltaSpeed(snapshot.speedDeltaMetersPerSecond)} up={snapshot.speedDeltaMetersPerSecond !== null && snapshot.speedDeltaMetersPerSecond > 0} />
    </div>
  );
}

function Delta({ k, v, up }: { k: string; v: string; up?: boolean }) {
  return (
    <div className="drow">
      <span className="k">{k}</span>
      <span className={`v${up ? " up" : ""}`}>{v}</span>
    </div>
  );
}

function YearProgress({ activities }: { readonly activities: ReadonlyArray<ActivityListItem> }) {
  const months = useMemo(() => {
    const totals = Array.from({ length: 12 }, (_, month) => ({ month, distanceMeters: 0 }));
    for (const activity of activities) {
      const date = parseIsoDate(activity.summary.startTime);
      if (date) totals[date.getMonth()]!.distanceMeters += activity.summary.totalDistanceMeters ?? 0;
    }
    return totals;
  }, [activities]);
  const maxDistance = Math.max(1, ...months.map((m) => m.distanceMeters));

  return (
    <div className="chart">
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      <div className="months" style={{ padding: 8 }}>
        {months.map((m) => {
          const h = Math.max(3, Math.round((m.distanceMeters / maxDistance) * 100));
          return (
            <div className="month" key={m.month}>
              <div className="track">
                <div className="bar" style={{ height: `${h}%` }} title={formatDistance(m.distanceMeters)} />
              </div>
              <div className="ml">
                <span>{MONTH_LABELS[m.month]}</span>
                <b>{m.distanceMeters > 0 ? formatDistance(m.distanceMeters).replace(" km", "") : "—"}</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ onUpload }: { readonly onUpload: () => void }) {
  return (
    <div className="empty">
      <div className="glyph">▲</div>
      <div className="t">No rides yet</div>
      <div className="d">Upload a FIT activity to start building the dashboard.</div>
      <button type="button" className="rh-btn" onClick={onUpload}>
        <FileUpIcon />
        Upload FIT
      </button>
    </div>
  );
}

/* ----------------------------- data helpers ----------------------------- */

interface SeasonTotals {
  rideCount: number;
  distanceMeters: number;
  movingSeconds: number;
  elapsedSeconds: number;
  ascentMeters: number;
  descentMeters: number;
  avgSpeedMetersPerSecond: number | null;
}

interface SeasonSnapshotData {
  activeMonths: number;
  latestRide: ActivityListItem | null;
  longestRide: ActivityListItem | null;
  fastestRide: ActivityListItem | null;
  biggestClimb: ActivityListItem | null;
  recentDistanceMeters: number;
  previousDistanceMeters: number | null;
  distanceDeltaMeters: number | null;
  recentAvgSpeedMetersPerSecond: number | null;
  previousAvgSpeedMetersPerSecond: number | null;
  speedDeltaMetersPerSecond: number | null;
}

function summarizeActivities(activities: ReadonlyArray<ActivityListItem>): SeasonTotals {
  const distanceMeters = activities.reduce((s, a) => s + (a.summary.totalDistanceMeters ?? 0), 0);
  const movingSeconds = activities.reduce((s, a) => s + (a.summary.totalMovingSeconds ?? 0), 0);
  const elapsedSeconds = activities.reduce((s, a) => s + (a.summary.totalElapsedSeconds ?? 0), 0);
  const ascentMeters = activities.reduce((s, a) => s + (a.summary.totalAscentMeters ?? 0), 0);
  const descentMeters = activities.reduce((s, a) => s + (a.summary.totalDescentMeters ?? 0), 0);
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

function summarizeSeason(activities: ReadonlyArray<ActivityListItem>): SeasonSnapshotData {
  const ordered = [...activities].sort((a, b) => {
    const at = parseIsoDate(a.summary.startTime)?.getTime() ?? 0;
    const bt = parseIsoDate(b.summary.startTime)?.getTime() ?? 0;
    return bt - at;
  });
  const activeMonths = new Set(
    ordered
      .map((a) => parseIsoDate(a.summary.startTime))
      .filter((d): d is Date => d !== null)
      .map((d) => `${d.getFullYear()}-${d.getMonth()}`),
  ).size;
  const recent = ordered.slice(0, 4);
  const previous = ordered.slice(4, 8);
  const recentDistanceMeters = sumDistance(recent);
  const previousDistanceMeters = previous.length > 0 ? sumDistance(previous) : null;
  const recentAvgSpeedMetersPerSecond = weightedAverageSpeed(recent);
  const previousAvgSpeedMetersPerSecond = previous.length > 0 ? weightedAverageSpeed(previous) : null;
  return {
    activeMonths,
    latestRide: ordered[0] ?? null,
    longestRide: maxBy(ordered, (a) => a.summary.totalDistanceMeters),
    fastestRide: maxBy(ordered, (a) => a.summary.avgSpeedMetersPerSecond),
    biggestClimb: maxBy(ordered, (a) => a.summary.totalAscentMeters),
    recentDistanceMeters,
    previousDistanceMeters,
    distanceDeltaMeters: previousDistanceMeters === null ? null : recentDistanceMeters - previousDistanceMeters,
    recentAvgSpeedMetersPerSecond,
    previousAvgSpeedMetersPerSecond,
    speedDeltaMetersPerSecond:
      previousAvgSpeedMetersPerSecond === null || recentAvgSpeedMetersPerSecond === null
        ? null
        : recentAvgSpeedMetersPerSecond - previousAvgSpeedMetersPerSecond,
  };
}

function monthlyDistance(activities: ReadonlyArray<ActivityListItem>): number {
  return activities.reduce((s, a) => s + (a.summary.totalDistanceMeters ?? 0), 0);
}

function maxBy(
  activities: ReadonlyArray<ActivityListItem>,
  getValue: (a: ActivityListItem) => number | null,
): ActivityListItem | null {
  let best: ActivityListItem | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const a of activities) {
    const v = getValue(a);
    if (v !== null && Number.isFinite(v) && v > bestValue) {
      best = a;
      bestValue = v;
    }
  }
  return best;
}

function sumDistance(activities: ReadonlyArray<ActivityListItem>): number {
  return activities.reduce((s, a) => s + (a.summary.totalDistanceMeters ?? 0), 0);
}

function weightedAverageSpeed(activities: ReadonlyArray<ActivityListItem>): number | null {
  const movingSeconds = activities.reduce((s, a) => s + (a.summary.totalMovingSeconds ?? 0), 0);
  return movingSeconds > 0 ? sumDistance(activities) / movingSeconds : null;
}

function projectRoutePoints(records: ReadonlyArray<ActivityRecord>) {
  const gps = records.filter(
    (r) =>
      typeof r.latitude === "number" &&
      typeof r.longitude === "number" &&
      Number.isFinite(r.latitude) &&
      Number.isFinite(r.longitude),
  );
  if (gps.length < 2) return [];
  const lats = gps.map((r) => r.latitude!);
  const lons = gps.map((r) => r.longitude!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latRange = Math.max(maxLat - minLat, 0.00001);
  const lonRange = Math.max(maxLon - minLon, 0.00001);
  const padding = 8;
  const size = 100 - padding * 2;
  return gps.map((r) => ({
    x: padding + ((r.longitude! - minLon) / lonRange) * size,
    y: padding + (1 - (r.latitude! - minLat) / latRange) * size,
  }));
}

function buildProfilePath(
  values: ReadonlyArray<number>,
  width: number,
  height: number,
  baseline: number,
  top: number,
): string | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.00001);
  const span = baseline - top;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = baseline - ((v - min) / range) * span;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildProfileArea(
  values: ReadonlyArray<number>,
  width: number,
  height: number,
  baseline: number,
  top: number,
): string | null {
  const line = buildProfilePath(values, width, height, baseline, top);
  if (!line) return null;
  return `${line} L${width.toFixed(2)} ${baseline} L0 ${baseline} Z`;
}

/* ------------------------------ formatters ------------------------------ */

function formatRideTitle(activity: ActivityListItem): string {
  const date = parseIsoDate(activity.summary.startTime);
  if (date === null) return activity.filename.replace(/\.fit$/i, "");
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
  if (date === null) return "n/a";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatDateTime(value: string | null): string {
  const date = parseIsoDate(value);
  if (date === null) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} km`;
}

function formatDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${(value * 3.6).toFixed(1)} km/h`;
}

function formatDeltaDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatDistance(value)}`;
}

function formatDeltaSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatSpeed(value)}`;
}

function formatElevation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value).toLocaleString()}`;
}

function formatBpm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} bpm`;
}

function formatWatts(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} W`;
}

function formatCadence(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} rpm`;
}

function formatCalories(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value).toLocaleString()} kcal`;
}

function parseIsoDate(value: string | null): Date | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

async function requestJson<A>(url: string, init?: RequestInit): Promise<A> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  return (await response.json()) as A;
}

async function uploadFitFile(file: File): Promise<FitImportResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  return requestJson<FitImportResponse>("/api/activities/import", { method: "POST", body: form });
}

function formatUploadProgress(progress: { readonly current: number; readonly total: number } | null): string {
  return progress ? `Importing ${progress.current}/${progress.total}` : "Importing";
}

function formatImportFailures(failures: ReadonlyArray<string>, total: number): string {
  const shown = failures.slice(0, 2).join(" ");
  const hiddenCount = failures.length - 2;
  const hidden = hiddenCount > 0 ? ` ${hiddenCount} more failed.` : "";
  return `${failures.length} of ${total} FIT files could not be imported. ${shown}${hidden}`;
}

function errorToMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}
