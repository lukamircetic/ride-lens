import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  SEASON,
  dateLong,
  duration,
  featured,
  km,
  kmFull,
  kmh,
  kmhFull,
  meters,
  monthly,
  profilePath,
  projectRoute,
  rides,
  seasonBests,
  seasonTotals,
  type Ride,
} from "./mock";

/**
 * MAILLOT — the season as a stage race, told in jerseys.
 *
 * Display: Anton (heavy condensed race-poster display) + Archivo (labels).
 * Palette: maillot jaune yellow, ink black, poster white, KOM polka-dot red,
 * a flash of maillot vert green for the sprint classification.
 * Signature: the hero is a giant dossard + poster headline; the feature ride
 * is drawn as a Tour-style mountain stage with categorized climb pennants.
 */

const CSS = `
[data-design="maillot"]{
  --yellow:#ffd400;
  --yellow-2:#f5c000;
  --ink:#111111;
  --paper:#fbf7ea;
  --paper-2:#f2edda;
  --red:#e2231a;
  --green:#1fa552;
  --grey:#5a5a5a;
  background:var(--paper);
  color:var(--ink);
  font-family:"Archivo",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  min-height:100svh;
}
[data-design="maillot"] *{box-sizing:border-box}
[data-design="maillot"] .display{font-family:"Anton",sans-serif;font-weight:400;letter-spacing:.005em;text-transform:uppercase;line-height:.86}
[data-design="maillot"] .mono{font-family:"Archivo",monospace;font-variant-numeric:tabular-nums}
[data-design="maillot"] .wrap{max-width:1240px;margin:0 auto;padding:0 28px}

/* ticker */
[data-design="maillot"] .ticker{background:var(--yellow);color:var(--ink);border-bottom:3px solid var(--ink);overflow:hidden;white-space:nowrap;padding:8px 0;font-family:"Archivo",sans-serif;font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
[data-design="maillot"] .ticker .track{display:inline-block;padding-left:100%;animation:ticker 36s linear infinite}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-100%)}}

[data-design="maillot"] .topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid var(--ink)}
[data-design="maillot"] .brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink)}
[data-design="maillot"] .brand .dot{width:18px;height:18px;border-radius:50%;background:var(--yellow);border:2px solid var(--ink)}
[data-design="maillot"] .brand b{font-family:"Anton",sans-serif;font-weight:400;font-size:20px;text-transform:uppercase;letter-spacing:.02em}
[data-design="maillot"] .topnav{display:flex;gap:16px}
[data-design="maillot"] .topnav a{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--grey);text-decoration:none}
[data-design="maillot"] .topnav a:hover{color:var(--ink)}

/* hero poster */
[data-design="maillot"] .poster{display:grid;grid-template-columns:0.85fr 1.15fr;gap:0;margin-top:26px;border:3px solid var(--ink)}
[data-design="maillot"] .dossard{background:var(--yellow);padding:28px 26px;display:flex;flex-direction:column;justify-content:space-between;position:relative;border-right:3px solid var(--ink)}
[data-design="maillot"] .dossard .perf{position:absolute;top:8px;left:0;right:0;height:8px;background:repeating-linear-gradient(90deg,transparent 0 8px,rgba(0,0,0,.35) 8px 10px)}
[data-design="maillot"] .dossard .lab{font-family:"Anton",sans-serif;font-size:14px;letter-spacing:.04em;text-transform:uppercase}
[data-design="maillot"] .dossard .num{font-family:"Anton",sans-serif;font-size:clamp(86px,12vw,150px);line-height:.82;letter-spacing:-.02em}
[data-design="maillot"] .dossard .meta{display:flex;justify-content:space-between;font-weight:700;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
[data-design="maillot"] .barcode{display:flex;gap:1px;height:24px;margin-top:10px}
[data-design="maillot"] .barcode i{background:var(--ink);display:block;width:2px;height:100%}
[data-design="maillot"] .barcode i.w{width:4px}
[data-design="maillot"] .barcode i.g{width:1px}

[data-design="maillot"] .poster-right{padding:28px 30px;background:var(--paper);display:flex;flex-direction:column;justify-content:space-between;gap:18px}
[data-design="maillot"] .poster-right h1{font-family:"Anton",sans-serif;font-weight:400;font-size:clamp(46px,6.4vw,84px);line-height:.84;text-transform:uppercase;margin:0}
[data-design="maillot"] .poster-right h1 .y{background:var(--yellow);padding:0 .12em}
[data-design="maillot"] .poster-right .lead{max-width:46ch;font-size:15px;line-height:1.55;color:#2a2a2a}
[data-design="maillot"] .pills{display:flex;gap:10px;flex-wrap:wrap}
[data-design="maillot"] .pill{border:2px solid var(--ink);padding:8px 14px;font-weight:700;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
[data-design="maillot"] .pill.y{background:var(--yellow)}

/* polka-dot band */
[data-design="maillot"] .kom{margin-top:0;border:3px solid var(--ink);border-top:0;background:
   radial-gradient(circle at 8px 8px,var(--red) 3px,transparent 3.5px) 0 0/16px 16px,
   var(--paper);
  display:flex;align-items:center;justify-content:space-between;padding:18px 24px}
[data-design="maillot"] .kom .k{font-family:"Anton",sans-serif;font-size:clamp(20px,2.4vw,30px);text-transform:uppercase;background:var(--paper);padding:4px 12px;border:2px solid var(--ink)}
[data-design="maillot"] .kom .v{font-family:"Anton",sans-serif;font-size:clamp(30px,4vw,48px);background:var(--paper);padding:2px 14px;border:2px solid var(--ink)}

/* jerseys */
[data-design="maillot"] .section{padding:54px 0;border-top:3px solid var(--ink)}
[data-design="maillot"] .sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:24px;flex-wrap:wrap}
[data-design="maillot"] .sec-title{font-family:"Anton",sans-serif;font-weight:400;font-size:clamp(22px,2.6vw,32px);text-transform:uppercase;line-height:.9}
[data-design="maillot"] .sec-title b{background:var(--yellow);padding:0 .1em}
[data-design="maillot"] .sec-sub{font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--grey)}

[data-design="maillot"] .jerseys{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
[data-design="maillot"] .jersey{border:3px solid var(--ink);background:var(--paper);display:flex;flex-direction:column;overflow:hidden}
[data-design="maillot"] .jersey .top{padding:16px 16px 14px;position:relative}
[data-design="maillot"] .jersey .collar{width:46px;height:18px;border:2px solid var(--ink);border-radius:0 0 14px 14px;margin:0 auto 12px;background:var(--paper)}
[data-design="maillot"] .jersey .name{font-family:"Anton",sans-serif;font-size:16px;text-transform:uppercase;line-height:.95}
[data-design="maillot"] .jersey .holder{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--grey);margin-top:6px}
[data-design="maillot"] .jersey .body{padding:12px 16px 18px;background:var(--paper-2);border-top:2px solid var(--ink);margin-top:auto}
[data-design="maillot"] .jersey .metric{font-family:"Anton",sans-serif;font-size:34px;line-height:.9}
[data-design="maillot"] .jersey .metric small{font-family:"Archivo",sans-serif;font-size:13px;font-weight:600}
[data-design="maillot"] .jersey .sub{font-size:12px;color:#3a3a3a;margin-top:6px;font-weight:600}
[data-design="maillot"] .jersey.yellow .top{background:var(--yellow)}
[data-design="maillot"] .jersey.polka .top{background:radial-gradient(circle at 7px 7px,var(--red) 2.6px,transparent 3px) 0 0/14px 14px,var(--paper)}
[data-design="maillot"] .jersey.green .top{background:var(--green);color:#fff}
[data-design="maillot"] .jersey.white .top{background:#fff}

/* stage profile */
[data-design="maillot"] .stage{border:3px solid var(--ink);background:var(--paper)}
[data-design="maillot"] .stage .head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:2px solid var(--ink);background:var(--paper-2)}
[data-design="maillot"] .stage .head .t{font-family:"Anton",sans-serif;font-size:18px;text-transform:uppercase}
[data-design="maillot"] .stage .head .d{font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--grey)}
[data-design="maillot"] .stage svg{display:block;width:100%;height:auto}

/* classification */
[data-design="maillot"] .cls{width:100%;border-collapse:collapse;font-family:"Archivo",sans-serif}
[data-design="maillot"] .cls th{text-align:left;font-weight:700;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:10px 12px;border-bottom:3px solid var(--ink)}
[data-design="maillot"] .cls th.r,.cls td.r{text-align:right}
[data-design="maillot"] .cls td{padding:11px 12px;border-bottom:1px solid #d8d2bd;font-size:14px}
[data-design="maillot"] .cls td.stg{font-family:"Anton",sans-serif;font-size:18px}
[data-design="maillot"] .cls tr:hover td{background:var(--yellow)}
[data-design="maillot"] .cls td.name{font-weight:700}
[data-design="maillot"] .cls a{color:inherit;text-decoration:none;display:contents}
[data-design="maillot"] .gc{font-family:"Anton",sans-serif;font-size:16px}

[data-design="maillot"] footer{padding:42px 0 60px;border-top:3px solid var(--ink);margin-top:0;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase}
[data-design="maillot"] footer .seal{width:44px;height:44px;background:var(--yellow);border:3px solid var(--ink);border-radius:50%;display:grid;place-items:center;font-family:"Anton",sans-serif;font-size:13px}

@media (max-width:880px){
  [data-design="maillot"] .poster{grid-template-columns:1fr}
  [data-design="maillot"] .dossard{border-right:0;border-bottom:3px solid var(--ink)}
  [data-design="maillot"] .jerseys{grid-template-columns:repeat(2,1fr)}
  [data-design="maillot"] .cls th:nth-child(3),.cls td:nth-child(3){display:none}
}
@media (prefers-reduced-motion:reduce){[data-design="maillot"] .ticker .track{animation:none}}
`;

export function MaillotDesign() {
  const totals = useMemo(() => seasonTotals(), []);
  const bests = useMemo(() => seasonBests(), []);
  const { ride, detail } = useMemo(() => featured(), []);
  const months = useMemo(() => monthly().filter((m) => m.month >= 2 && m.month <= 6), []);
  const records = detail.records;

  const elev = useMemo(
    () => records.map((r) => r.altitudeMeters ?? 0).filter((v) => v > 0),
    [records],
  );
  const route = useMemo(
    () => projectRoute(records, { width: 200, height: 120, padding: 6 }),
    [records],
  );

  const climbs = useMemo(() => findClimbs(elev), [elev]);
  const totalKm = Math.round(totals.distanceMeters / 1000);

  // cumulative GC distance
  const ordered = useMemo(
    () =>
      [...rides].sort(
        (a, b) => Date.parse(a.summary.startTime ?? "") - Date.parse(b.summary.startTime ?? ""),
      ),
    [],
  );
  let cum = 0;

  return (
    <div data-design="maillot">
      <style>{CSS}</style>
      <div className="ticker" aria-hidden="true">
        <span className="track">
          ◆ COURSE DIRECTEUR · TOUR OF THE SEASON · {totals.rideCount} STAGES ·{" "}
          {kmFull(totals.distanceMeters)} · {meters(totals.ascentMeters)} OF CLIMBING · DEPART{" "}
          {months[0]?.label ?? "MAR"} · ARRIVÉE {months.at(-1)?.label ?? "JUL"} · MAILLOT JAUNE:{" "}
          {SEASON.athlete.toUpperCase()} ◆ BROADCAST · COURSE RADIO · KM 0 ◆
        </span>
      </div>

      <div className="wrap">
        <div className="topbar">
          <Link to="/" className="brand">
            <span className="dot" aria-hidden="true" />
            <b>Ride-Lens · Course</b>
          </Link>
          <nav className="topnav">
            <Link to="/1">01 Tarmac</Link>
            <Link to="/2">02 Zone</Link>
            <Link to="/3">03 Contour</Link>
            <Link to="/5">05 Heatmap</Link>
          </nav>
        </div>

        {/* POSTER */}
        <section className="poster" aria-label="Season poster">
          <div className="dossard">
            <span className="perf" aria-hidden="true" />
            <div>
              <div className="lab">Dossard · total km</div>
              <div className="num">{totalKm.toLocaleString()}</div>
              <div className="barcode" aria-hidden="true">
                {Array.from({ length: 44 }).map((_, i) => (
                  <i key={i} className={i % 5 === 0 ? "w" : i % 3 === 0 ? "g" : ""} />
                ))}
              </div>
            </div>
            <div className="meta">
              <span>№ {SEASON.year}</span>
              <span>{totals.rideCount} stages</span>
            </div>
          </div>

          <div className="poster-right">
            <div>
              <h1 className="display">
                Tour of
                <br />
                the <span className="y">season.</span>
              </h1>
            </div>
            <p className="lead">
              {totals.rideCount} stages, {kmFull(totals.distanceMeters)} and{" "}
              {meters(totals.ascentMeters)} of climbing — a private Tour, ridden solo, classified
              like a race. The jerseys go to the longest, the highest, the fastest and the freshest.
            </p>
            <div className="pills">
              <span className="pill y">GC leader · {SEASON.athlete}</span>
              <span className="pill">{kmhFull(totals.avgSpeedMetersPerSecond)} mean</span>
              <span className="pill">{duration(totals.movingSeconds)} saddle</span>
            </div>
          </div>
        </section>

        {/* KOM BAND */}
        <div className="kom" role="group" aria-label="King of the mountains">
          <div className="k">King of the mountains · grand prix de la montagne</div>
          <div className="v">{meters(totals.ascentMeters)}</div>
        </div>

        {/* JERSEYS */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              The <b>classifications.</b>
            </div>
            <div className="sec-sub">four jerseys · four leaders</div>
          </div>
          {bests ? (
            <div className="jerseys">
              <Jersey
                variant="yellow"
                name="Maillot Jaune"
                holder="General classification · distance"
                metric={km(bests.longest.summary.totalDistanceMeters)}
                unit="km"
                sub={`longest stage · ${dateLong(bests.longest.summary.startTime)}`}
              />
              <Jersey
                variant="polka"
                name="Maillot Pois"
                holder="Mountains · most climbing"
                metric={meters(bests.climbiest.summary.totalAscentMeters)}
                unit=""
                sub={`steepest day · ${dateLong(bests.climbiest.summary.startTime)}`}
              />
              <Jersey
                variant="green"
                name="Maillot Vert"
                holder="Points · fastest average"
                metric={kmh(bests.fastest.summary.avgSpeedMetersPerSecond)}
                unit="km/h"
                sub={`speed record · ${dateLong(bests.fastest.summary.startTime)}`}
              />
              <Jersey
                variant="white"
                name="Maillot Blanc"
                holder="Young rider · latest stage"
                metric={km(bests.mostRecent.summary.totalDistanceMeters)}
                unit="km"
                sub={`most recent · ${dateLong(bests.mostRecent.summary.startTime)}`}
              />
            </div>
          ) : null}
        </section>

        {/* STAGE PROFILE */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              Reine <b>stage.</b>
            </div>
            <div className="sec-sub">
              {ride.filename.replace(/\.fit$/, "")} · {dateLong(ride.summary.startTime)}
            </div>
          </div>

          <div className="stage">
            <div className="head">
              <div className="t">Stage profile · {kmFull(ride.summary.totalDistanceMeters)}</div>
              <div className="d">
                {climbs.length} categorized climbs · {meters(ride.summary.totalAscentMeters)} ▲
              </div>
            </div>
            <svg viewBox="0 0 1000 280" role="img" aria-label="Categorized stage profile">
              {/* grid */}
              {Array.from({ length: 5 }).map((_, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={i * 56 + 20}
                  x2="1000"
                  y2={i * 56 + 20}
                  stroke="#e3dcc4"
                  strokeWidth="1"
                />
              ))}
              {/* profile */}
              <path
                d={profilePath(elev, { width: 1000, height: 280, baseline: 260, top: 30 })}
                fill="none"
                stroke="#111"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {/* climbs */}
              {climbs.map((c, i) => {
                const x = c.t * 1000;
                const y =
                  260 -
                  ((c.value - elevMin(elev)) / Math.max(1, elevMax(elev) - elevMin(elev))) * 230;
                return (
                  <g key={i}>
                    <line x1={x} y1={y} x2={x} y2={y - 40} stroke="#111" strokeWidth="1.5" />
                    <rect
                      x={x - 18}
                      y={y - 62}
                      width="36"
                      height="22"
                      fill={c.color}
                      stroke="#111"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y - 46}
                      textAnchor="middle"
                      fontFamily="Anton, sans-serif"
                      fontSize="14"
                      fill={c.color === "#ffd400" ? "#111" : "#fff"}
                    >
                      {c.cat}
                    </text>
                    <text
                      x={x}
                      y={y - 70}
                      textAnchor="middle"
                      fontFamily="Archivo, sans-serif"
                      fontWeight="700"
                      fontSize="10"
                      fill="#5a5a5a"
                    >
                      {c.grad.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
              {/* start / finish banners */}
              <g>
                <rect x="2" y="240" width="3" height="20" fill="#111" />
                <text x="10" y="275" fontFamily="Anton, sans-serif" fontSize="13">
                  DÉPART
                </text>
                <rect x="995" y="240" width="3" height="20" fill="#111" />
                <text x="988" y="275" textAnchor="end" fontFamily="Anton, sans-serif" fontSize="13">
                  ARRIVÉE
                </text>
              </g>
            </svg>
          </div>
        </section>

        {/* ROUTE INSIGNIA + MONTHLY */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              Stage <b>map.</b>
            </div>
            <div className="sec-sub">course shape · queen stage</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 14 }}>
            <div className="stage" style={{ padding: 16 }}>
              <svg
                viewBox="0 0 200 120"
                role="img"
                aria-label="Queen stage route"
                style={{ width: "100%", height: "auto", display: "block" }}
              >
                <polyline
                  points={route.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#111"
                  strokeWidth="4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  points={route.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#ffd400"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="1 4"
                />
              </svg>
            </div>
            <div className="stage" style={{ padding: 18 }}>
              <div
                className="head"
                style={{
                  padding: 0,
                  borderBottom: "2px solid #111",
                  paddingBottom: 8,
                  marginBottom: 14,
                  background: "transparent",
                }}
              >
                <div className="t" style={{ fontSize: 16 }}>
                  Distance by month
                </div>
                <div className="d">{kmFull(months.reduce((s, m) => s + m.distanceMeters, 0))}</div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${months.length},1fr)`,
                  gap: 8,
                  alignItems: "end",
                  height: 130,
                }}
              >
                {months.map((m) => {
                  const max = Math.max(1, ...months.map((mm) => mm.distanceMeters));
                  const h = Math.max(6, (m.distanceMeters / max) * 100);
                  return (
                    <div
                      key={m.month}
                      style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}
                    >
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                        <div
                          style={{
                            width: "100%",
                            height: `${h}%`,
                            background: m.distanceMeters === max ? "var(--red)" : "#111",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: "Anton, sans-serif",
                          fontSize: 14,
                          textTransform: "uppercase",
                        }}
                      >
                        {m.label}
                      </div>
                      <div style={{ fontFamily: "Archivo", fontWeight: 700, fontSize: 11 }}>
                        {km(m.distanceMeters)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CLASSIFICATION */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              General <b>classification.</b>
            </div>
            <div className="sec-sub">{rides.length} stages · chronologically</div>
          </div>
          <table className="cls">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Name</th>
                <th>Date</th>
                <th className="r">Distance</th>
                <th className="r">Avg</th>
                <th className="r">GC km</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((r, i) => {
                cum += r.summary.totalDistanceMeters ?? 0;
                return <ClassRow key={r.id} ride={r} index={i + 1} cumulative={cum} />;
              })}
            </tbody>
          </table>
        </section>

        <footer>
          <span className="seal">RL</span>
          <span>Ride-Lens · Course · {SEASON.year}</span>
          <span>Arrivée · {km(totals.distanceMeters)} km</span>
        </footer>
      </div>
    </div>
  );
}

function Jersey({
  variant,
  name,
  holder,
  metric,
  unit,
  sub,
}: {
  variant: "yellow" | "polka" | "green" | "white";
  name: string;
  holder: string;
  metric: string;
  unit: string;
  sub: string;
}) {
  return (
    <div className={`jersey ${variant}`}>
      <div className="top">
        <div className="collar" aria-hidden="true" />
        <div className="name">{name}</div>
        <div className="holder">{holder}</div>
      </div>
      <div className="body">
        <div className="metric">
          {metric}
          {unit ? <small> {unit}</small> : null}
        </div>
        <div className="sub">{sub}</div>
      </div>
    </div>
  );
}

function ClassRow({ ride, index, cumulative }: { ride: Ride; index: number; cumulative: number }) {
  return (
    <tr>
      <td className="stg">{String(index).padStart(2, "0")}</td>
      <td className="name">
        <Link to="/rides/$activityId" params={{ activityId: ride.id }}>
          {ride.filename.replace(/\.fit$/, "").replace(/-/g, " ")}
        </Link>
      </td>
      <td>{dateLong(ride.summary.startTime)}</td>
      <td className="r">{km(ride.summary.totalDistanceMeters)} km</td>
      <td className="r">{kmh(ride.summary.avgSpeedMetersPerSecond)}</td>
      <td className="r gc">{(cumulative / 1000).toFixed(0)}</td>
    </tr>
  );
}

/* categorized climb detection */
interface Climb {
  t: number;
  value: number;
  prominence: number;
  cat: string;
  color: string;
  grad: number;
}

function findClimbs(elev: ReadonlyArray<number>): Climb[] {
  if (elev.length < 20) return [];
  const min = elevMin(elev);
  const max = elevMax(elev);
  const range = Math.max(max - min, 1);
  const n = elev.length;

  const candidates: Array<{ idx: number; value: number; prom: number }> = [];
  const window = Math.max(8, Math.floor(n / 40));
  for (let i = window; i < n - window; i++) {
    const v = elev[i]!;
    let isMax = true;
    for (let j = i - window; j <= i + window; j++) {
      if (elev[j]! > v) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;
    // prominence: height above the lowest point within window
    let lo = Infinity;
    for (let j = i - window; j <= i + window; j++) lo = Math.min(lo, elev[j]!);
    const prom = v - lo;
    if (prom > range * 0.12) candidates.push({ idx: i, value: v, prom });
  }

  // merge nearby candidates
  candidates.sort((a, b) => b.prom - a.prom);
  const chosen: typeof candidates = [];
  for (const c of candidates) {
    if (chosen.every((cc) => Math.abs(cc.idx - c.idx) > window * 1.5)) chosen.push(c);
    if (chosen.length >= 5) break;
  }

  const maxProm = Math.max(...chosen.map((c) => c.prom), 1);
  return chosen.map((c) => {
    const ratio = c.prom / maxProm;
    let cat = "C3";
    let color = "#1fa552";
    if (ratio > 0.78) {
      cat = "HC";
      color = "#e2231a";
    } else if (ratio > 0.55) {
      cat = "C1";
      color = "#111";
    } else if (ratio > 0.32) {
      cat = "C2";
      color = "#111";
    } else {
      cat = "C3";
      color = "#1fa552";
    }
    // estimate grade from the climb approach
    const start = Math.max(0, c.idx - window);
    const dElev = c.value - (elev[start] ?? c.value);
    const grad = (dElev / Math.max(1, window)) * 0.6;
    return {
      t: c.idx / (n - 1),
      value: c.value,
      prominence: c.prom,
      cat,
      color,
      grad: Math.min(14, Math.max(2, grad)),
    };
  });
}

function elevMin(a: ReadonlyArray<number>): number {
  return a.length ? Math.min(...a) : 0;
}
function elevMax(a: ReadonlyArray<number>): number {
  return a.length ? Math.max(...a) : 0;
}
