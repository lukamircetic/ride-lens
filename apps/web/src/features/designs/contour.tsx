import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  SEASON,
  dateTime,
  featured,
  km,
  kmFull,
  meters,
  monthly,
  profileArea,
  projectRoute,
  rides,
  seasonTotals,
  type Ride,
} from "./mock";

/**
 * CONTOUR — the season as a topographic survey.
 *
 * Display: Spectral (a surveyor's serif) + IBM Plex Mono (coordinates).
 * Palette: deep navy chart paper, faint cyan contour isolines, sodium-amber
 * route trace, a snow-white ink for type.
 * Signature: the feature route rendered as concentric contour rings on a
 * graticulated chart, with the trace glowing amber — like a night survey.
 */

const CSS = `
[data-design="contour"]{
  --night:#1b1d21;
  --night-2:#23262c;
  --abyss:#15181e;
  --ink:#f2efe6;
  --ink-2:#bdb9ad;
  --ink-3:#7d7a70;
  --line:#3a3f47;
  --line-2:#2a2d33;
  --contour:rgba(242,239,230,.08);
  --contour-strong:rgba(242,239,230,.30);
  --amber:#ffc72c;
  --amber-2:#ffd95f;
  --amber-deep:#9c7a12;
  --sign-green:#0b5138;
  --sign-green-edge:#0a3f2c;
  background:var(--night);
  color:var(--ink);
  font-family:"Overpass",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  min-height:100svh;
}
[data-design="contour"] *{box-sizing:border-box}
[data-design="contour"] .mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
[data-design="contour"] .wrap{max-width:1240px;margin:0 auto;padding:0 28px}

/* header */
/* road-line header */
[data-design="contour"] .road-header{padding:26px 0 22px}
[data-design="contour"] .road-header .rh-row{display:flex;align-items:center;gap:22px}
[data-design="contour"] .rh-title{font-family:"Overpass",sans-serif;font-weight:900;font-size:30px;line-height:1;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);text-decoration:none;white-space:nowrap}
[data-design="contour"] .rh-nav{display:flex;gap:18px;white-space:nowrap}
[data-design="contour"] .rh-nav a{font-family:"Overpass",sans-serif;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2);text-decoration:none}
[data-design="contour"] .rh-nav a:hover{color:var(--amber)}
[data-design="contour"] .rh-line{flex:1;height:3px;background:repeating-linear-gradient(90deg,var(--amber) 0 26px,transparent 26px 44px);transform:translateY(-2px)}

/* hero */
[data-design="contour"] .hero{padding:54px 0 24px;display:grid;grid-template-columns:0.85fr 1.15fr;gap:48px;align-items:start}
[data-design="contour"] .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--amber)}

/* green street-sign gantry */
[data-design="contour"] .gantry{margin-top:20px;background:var(--sign-green);color:#fff;border:4px solid #fff;box-shadow:0 0 0 4px var(--sign-green-edge),0 22px 50px rgba(0,0,0,.45);border-radius:8px;overflow:hidden}
[data-design="contour"] .gantry-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;padding:15px 24px;border-top:2px solid rgba(255,255,255,.85)}
[data-design="contour"] .gantry-row:first-child{border-top:0}
[data-design="contour"] .gantry-dest{display:flex;align-items:center;gap:14px;font-family:"Overpass",sans-serif;font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
[data-design="contour"] .gantry-dest .arrow{color:#fff;opacity:.9}
[data-design="contour"] .gantry-val{font-family:"Overpass Mono",monospace;font-weight:800;font-size:26px;letter-spacing:.01em;white-space:nowrap}
[data-design="contour"] .gantry-val small{font-size:.5em;font-weight:600;opacity:.8;margin-left:6px}

/* survey chart frame */
[data-design="contour"] .chart{position:relative;border:1px solid var(--line);background:var(--abyss);padding:14px}
[data-design="contour"] .chart .corner{position:absolute;width:14px;height:14px;border:1px solid var(--amber);opacity:.7}
[data-design="contour"] .chart .corner.tl{top:-1px;left:-1px;border-right:0;border-bottom:0}
[data-design="contour"] .chart .corner.tr{top:-1px;right:-1px;border-left:0;border-bottom:0}
[data-design="contour"] .chart .corner.bl{bottom:-1px;left:-1px;border-right:0;border-top:0}
[data-design="contour"] .chart .corner.br{bottom:-1px;right:-1px;border-left:0;border-top:0}
[data-design="contour"] .chart .cap{display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}

/* benchmarks removed — replaced by the green gantry sign */

/* sections */
[data-design="contour"] .section{padding:56px 0;border-top:1px solid var(--line-2)}
[data-design="contour"] .sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:26px;flex-wrap:wrap}
[data-design="contour"] .sec-title{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-2)}
[data-design="contour"] .sec-title b{color:var(--amber)}
[data-design="contour"] .sec-sub{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.08em}

/* elev profile */
[data-design="contour"] .profile-wrap{padding:18px}
[data-design="contour"] .profile-axis{display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.1em;margin-top:8px}

/* ridgeline monthly */
[data-design="contour"] .ridge-box{padding:10px 6px 4px}
[data-design="contour"] .ridge{position:relative;height:300px}
[data-design="contour"] .ridge svg{width:100%;height:100%;display:block}
[data-design="contour"] .ridge-key{display:flex;gap:18px;justify-content:flex-end;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink-3);margin-top:6px}

/* field log table */
[data-design="contour"] .log{width:100%;border-collapse:collapse;font-family:"IBM Plex Mono",monospace;font-size:12.5px}
[data-design="contour"] .log th{text-align:left;font-weight:500;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;font-size:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
[data-design="contour"] .log td{padding:11px 12px;border-bottom:1px solid var(--line-2);color:var(--ink-2)}
[data-design="contour"] .log td.name{color:var(--ink)}
[data-design="contour"] .log td.amber{color:var(--amber-2)}
[data-design="contour"] .log tr:hover td{background:rgba(255,199,44,.06)}
[data-design="contour"] .log a{color:inherit;text-decoration:none;display:contents}

[data-design="contour"] footer{padding:42px 0 60px;border-top:1px solid var(--line-2);margin-top:8px;display:flex;justify-content:space-between;font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}

@media (max-width:880px){
  [data-design="contour"] .hero{grid-template-columns:1fr;gap:32px}
}
@media (prefers-reduced-motion:reduce){[data-design="contour"] *{animation:none!important;transition:none!important}}
`;

/* ------------------------------ colour schemes ------------------------------ */

const MAP_W = 620;
const MAP_H = 460;

export function ContourDesign() {
  const totals = useMemo(() => seasonTotals(), []);
  const { ride, detail } = useMemo(() => featured(), []);
  const months = useMemo(() => monthly().filter((m) => m.month >= 2 && m.month <= 6), []);
  const records = detail.records;

  const route = useMemo(
    () => projectRoute(records, { width: MAP_W, height: MAP_H, padding: 36 }),
    [records],
  );
  const elev = useMemo(
    () => records.map((r) => r.altitudeMeters ?? 0).filter((v) => v > 0),
    [records],
  );

  const centroid = useMemo(() => {
    if (route.length === 0) return { x: MAP_W / 2, y: MAP_H / 2 };
    const sx = route.reduce((s, p) => s + p.x, 0);
    const sy = route.reduce((s, p) => s + p.y, 0);
    return { x: sx / route.length, y: sy / route.length };
  }, [route]);

  const contourRings = useMemo(() => {
    const scales = [0.34, 0.48, 0.62, 0.78, 1];
    return scales.map((s) =>
      route.map((p) => ({
        x: centroid.x + (p.x - centroid.x) * s,
        y: centroid.y + (p.y - centroid.y) * s,
      })),
    );
  }, [route, centroid]);

  const routeLine = route.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div data-design="contour">
      <style>{CSS}</style>
      <div className="wrap">
        <header className="road-header">
          <div className="rh-row">
            <Link to="/" className="rh-title">
              Ride Lens
            </Link>
            <span className="rh-line" aria-hidden="true" />
            <nav className="rh-nav">
              <Link to="/1">01 Tarmac</Link>
              <Link to="/2">02 Zone</Link>
              <Link to="/4">04 Mailhot</Link>
              <Link to="/5">05 Heatmap</Link>
            </nav>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div>
            <div className="eyebrow">Season {SEASON.year} · field report</div>
            <div className="gantry" role="group" aria-label="Season totals">
              <GantryRow label="Total distance" value={km(totals.distanceMeters)} unit="km" />
              <GantryRow label="Vertical gained" value={meters(totals.ascentMeters)} unit="m" />
              <GantryRow
                label="Mean velocity"
                value={(totals.avgSpeedMetersPerSecond * 3.6).toFixed(1)}
                unit="km/h"
              />
              <GantryRow label="Traces logged" value={String(totals.rideCount)} />
            </div>
          </div>

          {/* THE SURVEY MAP */}
          <div className="chart">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <div className="cap">
              <span>FIG. 01 · {ride.filename.replace(/\.fit$/, "")}</span>
              <span>
                {records.length} pts · {dateTime(ride.summary.startTime)}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              role="img"
              aria-label="Topographic survey of feature ride"
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              {/* graticule */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`gv${i}`}
                  x1={(i + 1) * (MAP_W / 13)}
                  y1="0"
                  x2={(i + 1) * (MAP_W / 13)}
                  y2={MAP_H}
                  stroke="var(--line-2)"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={`gh${i}`}
                  x1="0"
                  y1={(i + 1) * (MAP_H / 10)}
                  x2={MAP_W}
                  y2={(i + 1) * (MAP_H / 10)}
                  stroke="var(--line-2)"
                  strokeWidth="1"
                />
              ))}
              {/* contour rings */}
              {contourRings.map((ring, i) => (
                <polyline
                  key={i}
                  points={ring.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={
                    i === contourRings.length - 1 ? "var(--contour-strong)" : "var(--contour)"
                  }
                  strokeWidth={i === contourRings.length - 1 ? "1.5" : "1"}
                  strokeLinejoin="round"
                />
              ))}
              {/* glow underlay */}
              <polyline
                points={routeLine}
                fill="none"
                stroke="var(--amber-deep)"
                strokeWidth="9"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.5"
              />
              <polyline
                points={routeLine}
                fill="none"
                stroke="var(--amber)"
                strokeWidth="2.6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* start/end marks */}
              {route[0] ? (
                <g>
                  <circle
                    cx={route[0].x}
                    cy={route[0].y}
                    r="4"
                    fill="var(--night)"
                    stroke="var(--amber)"
                    strokeWidth="2"
                  />
                  <text
                    x={route[0].x + 8}
                    y={route[0].y + 3}
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize="10"
                    fill="var(--amber-2)"
                  >
                    START
                  </text>
                </g>
              ) : null}
              {route.at(-1) ? (
                <circle cx={route.at(-1)!.x} cy={route.at(-1)!.y} r="3.5" fill="var(--amber)" />
              ) : null}
            </svg>
            <div className="profile-axis">
              <span>W ←</span>
              <span>grid 100 m</span>
              <span>→ E</span>
            </div>
          </div>
        </section>

        {/* ELEVATION PROFILE */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              <b>▲</b> Fig. 02 · elevation profile · feature ride
            </div>
            <div className="sec-sub">
              {kmFull(ride.summary.totalDistanceMeters)} · {meters(ride.summary.totalAscentMeters)}{" "}
              gained
            </div>
          </div>
          <div className="chart">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <div className="profile-wrap">
              <svg
                viewBox="0 0 1000 240"
                style={{ width: "100%", height: "auto", display: "block" }}
                role="img"
                aria-label="Elevation profile"
              >
                <defs>
                  <linearGradient id="elevfill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffc72c" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ffc72c" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 40 + 20}
                    x2="1000"
                    y2={i * 40 + 20}
                    stroke="var(--line-2)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d={profileArea(elev, { width: 1000, height: 240, baseline: 222, top: 14 })}
                  fill="url(#elevfill)"
                />
                <path
                  d={profileArea(elev, { width: 1000, height: 240, baseline: 222, top: 14 })}
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="2"
                />
              </svg>
              <div className="profile-axis">
                <span>0 km</span>
                <span>{km(ride.summary.totalDistanceMeters)} km</span>
                <span>peak {meters(maxArr(elev))}</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIDGELINE MONTHLY */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              <b>▲</b> Fig. 03 · monthly ridgeline · distance as range
            </div>
            <div className="sec-sub">
              {kmFull(months.reduce((s, m) => s + m.distanceMeters, 0))} across {months.length}{" "}
              months
            </div>
          </div>
          <div className="chart">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <div className="ridge-box">
              <div className="ridge">
                <Ridgeline months={months} />
              </div>
              <div className="ridge-key">
                <span>↙ low volume</span>
                <span style={{ color: "var(--amber-2)" }}>▲ high volume</span>
              </div>
            </div>
          </div>
        </section>

        {/* FIELD LOG */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              <b>▲</b> Field log · all traces
            </div>
            <div className="sec-sub">{rides.length} entries · most recent first</div>
          </div>
          <table className="log">
            <thead>
              <tr>
                <th>Stn</th>
                <th>Trace</th>
                <th>Date</th>
                <th>Lat</th>
                <th>Lon</th>
                <th style={{ textAlign: "right" }}>Δ dist</th>
                <th style={{ textAlign: "right" }}>▲ m</th>
              </tr>
            </thead>
            <tbody>
              {[...rides].reverse().map((r, i) => (
                <LogRow key={r.id} ride={r} index={rides.length - i} />
              ))}
            </tbody>
          </table>
        </section>

        <footer>
          <span>Plotted · ride-lens · {SEASON.year}</span>
          <span>datum WGS-84 · UTM 32T</span>
          <span>✛ end of sheet</span>
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

function LogRow({ ride, index }: { ride: Ride; index: number }) {
  return (
    <tr>
      <td>{String(index).padStart(3, "0")}</td>
      <td className="name">
        <Link to="/rides/$activityId" params={{ activityId: ride.id }}>
          {ride.filename.replace(/\.fit$/, "")}
        </Link>
      </td>
      <td>{dateTime(ride.summary.startTime)}</td>
      <td>{ride.summary.startLatitude?.toFixed(4)}</td>
      <td>{ride.summary.startLongitude?.toFixed(4)}</td>
      <td style={{ textAlign: "right" }} className="amber">
        {km(ride.summary.totalDistanceMeters)} km
      </td>
      <td style={{ textAlign: "right" }}>{meters(ride.summary.totalAscentMeters)}</td>
    </tr>
  );
}

function Ridgeline({ months }: { months: ReturnType<typeof monthly> }) {
  const W = 1000;
  const H = 300;
  const rowH = H / months.length;
  const maxDist = Math.max(1, ...months.map((m) => m.distanceMeters));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly distance ridgeline">
      {months.map((m, idx) => {
        const peak = (m.distanceMeters / maxDist) * (rowH * 0.92);
        const baseY = H - idx * rowH * 0.72;
        const samples = 48;
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          // a mountain-like silhouette modulated by a pseudo-random seed from month
          const env = Math.sin(t * Math.PI) ** 0.7;
          const detail =
            0.6 + 0.4 * Math.abs(Math.sin(t * Math.PI * (3 + (m.month % 3)) + m.month));
          const y = baseY - peak * env * detail;
          pts.push({ x: t * W, y });
        }
        const line = pts
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");
        const area = `${line} L${W} ${baseY} L0 ${baseY} Z`;
        const isMax = m.distanceMeters === maxDist;
        return (
          <g key={m.month}>
            <path
              d={area}
              fill={isMax ? "var(--amber)" : "var(--contour-strong)"}
              fillOpacity={isMax ? 0.18 : 0.08}
            />
            <path
              d={line}
              fill="none"
              stroke={isMax ? "var(--amber)" : "var(--contour-strong)"}
              strokeWidth={isMax ? "2" : "1.3"}
            />
            <text
              x="10"
              y={baseY - 2}
              fontFamily="IBM Plex Mono, monospace"
              fontSize="12"
              fill={isMax ? "var(--amber-2)" : "var(--ink-3)"}
            >
              {m.label} · {km(m.distanceMeters)} km
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function maxArr(a: ReadonlyArray<number>): number {
  return a.length ? Math.max(...a) : 0;
}
