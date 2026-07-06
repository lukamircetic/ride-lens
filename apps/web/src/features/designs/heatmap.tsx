import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  SEASON,
  dateLong,
  duration,
  featured,
  globalBounds,
  heatmapPaths,
  km,
  kmFull,
  kmhFull,
  meters,
  monthly,
  projectRoute,
  rideDetail,
  rides,
  seasonTotals,
  type Ride,
} from "./mock";

/**
 * HEATMAP — the geography of a season.
 *
 * Display: Sora (display + body) + Space Mono (coordinates / data).
 * Palette: deep slate canvas, a cool→hot density ramp (blue → orange →
 * yellow) lit by additive `screen` blending where routes overlap.
 * Signature: every ride overlaid on one shared map, glowing hottest on the
 * roads you ride most — the honest picture of where your season actually
 * happened.
 */

const CSS = `
[data-design="heatmap"]{
  --abyss:#070c16;
  --slate:#0b1322;
  --slate-2:#0f1a2e;
  --panel:#0e1828;
  --panel-2:#132036;
  --ink:#e9eef5;
  --ink-2:#8a99ad;
  --ink-3:#52637a;
  --line:#1b2a42;
  --line-2:#152238;
  --cool:#2e6fae;
  --hot:#fc4c02;
  --hot-2:#ff8a3a;
  --peak:#ffd400;
  background:var(--slate);
  color:var(--ink);
  font-family:"Sora",system-ui,sans-serif;
  font-feature-settings:"tnum" 1;
  -webkit-font-smoothing:antialiased;
  min-height:100svh;
}
[data-design="heatmap"] *{box-sizing:border-box}
[data-design="heatmap"] .mono{font-family:"Space Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
[data-design="heatmap"] .wrap{max-width:1240px;margin:0 auto;padding:0 28px}

[data-design="heatmap"] .topbar{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid var(--line)}
[data-design="heatmap"] .brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink)}
[data-design="heatmap"] .brand .grad{width:22px;height:22px;border-radius:5px;background:linear-gradient(135deg,#2e6fae,#fc4c02 55%,#ffd400)}
[data-design="heatmap"] .brand b{font-weight:600;font-size:15px;letter-spacing:-.01em}
[data-design="heatmap"] .topnav{display:flex;gap:16px}
[data-design="heatmap"] .topnav a{font-size:13px;color:var(--ink-2);text-decoration:none}
[data-design="heatmap"] .topnav a:hover{color:var(--hot-2)}

[data-design="heatmap"] .hero{padding:46px 0 22px}
[data-design="heatmap"] .eyebrow{font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--hot-2)}
[data-design="heatmap"] .hero h1{font-weight:600;font-size:clamp(38px,5.6vw,68px);line-height:1;margin:16px 0 0;letter-spacing:-.025em;max-width:16ch}
[data-design="heatmap"] .hero h1 i{font-style:normal;color:var(--hot-2)}
[data-design="heatmap"] .hero .lede{margin:20px 0 0;color:var(--ink-2);font-size:16px;line-height:1.6;max-width:54ch}

/* the map canvas */
[data-design="heatmap"] .canvas{margin-top:30px;border:1px solid var(--line);background:var(--abyss);border-radius:10px;overflow:hidden;position:relative}
[data-design="heatmap"] .canvas svg{display:block;width:100%;height:auto}
[data-design="heatmap"] .legend{position:absolute;left:16px;bottom:16px;background:rgba(7,12,22,.7);border:1px solid var(--line);border-radius:8px;padding:10px 12px;backdrop-filter:blur(6px)}
[data-design="heatmap"] .legend .lgbar{width:180px;height:8px;border-radius:4px;background:linear-gradient(90deg,#1c3a52,#2e6fae 25%,#f97316 55%,#fc4c02 75%,#ffd400)}
[data-design="heatmap"] .legend .lglab{display:flex;justify-content:space-between;font-family:"Space Mono",monospace;font-size:10px;color:var(--ink-2);letter-spacing:.08em;margin-top:5px}
[data-design="heatmap"] .scalebadge{position:absolute;right:16px;top:16px;font-family:"Space Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.1em;border:1px solid var(--line);border-radius:6px;padding:5px 9px;background:rgba(7,12,22,.6)}

/* stat strip */
[data-design="heatmap"] .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
[data-design="heatmap"] .stat{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px}
[data-design="heatmap"] .stat .k{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
[data-design="heatmap"] .stat .v{font-size:26px;font-weight:600;margin-top:8px;letter-spacing:-.02em}
[data-design="heatmap"] .stat .v small{font-size:13px;color:var(--ink-2);font-weight:400;margin-left:3px}
[data-design="heatmap"] .stat .h{margin-top:12px;height:24px;display:flex;align-items:flex-end;gap:2px}
[data-design="heatmap"] .stat .h i{flex:1;background:var(--hot);border-radius:1px}

/* sections */
[data-design="heatmap"] .section{padding:48px 0;border-top:1px solid var(--line-2)}
[data-design="heatmap"] .sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:22px;flex-wrap:wrap}
[data-design="heatmap"] .sec-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
[data-design="heatmap"] .sec-title b{color:var(--hot-2)}
[data-design="heatmap"] .sec-sub{font-family:"Space Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.06em}

/* hot zones */
[data-design="heatmap"] .hotzones{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
[data-design="heatmap"] .hz{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:18px;position:relative;overflow:hidden}
[data-design="heatmap"] .hz .rank{position:absolute;top:14px;right:16px;font-family:"Space Mono",monospace;font-size:11px;color:var(--ink-3)}
[data-design="heatmap"] .hz .coord{font-family:"Space Mono",monospace;font-size:12px;color:var(--ink-2);letter-spacing:.04em}
[data-design="heatmap"] .hz .passes{font-size:30px;font-weight:600;margin-top:8px;letter-spacing:-.02em}
[data-design="heatmap"] .hz .passes small{font-size:13px;color:var(--ink-2);font-weight:400;margin-left:4px}
[data-design="heatmap"] .hz .heatbar{height:8px;border-radius:4px;margin-top:14px;background:var(--slate-2);overflow:hidden}
[data-design="heatmap"] .hz .heatbar i{display:block;height:100%;border-radius:4px}
[data-design="heatmap"] .hz .lab{font-family:"Space Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;margin-top:10px}

/* monthly heat strips */
[data-design="heatmap"] .strips{display:flex;flex-direction:column;gap:12px}
[data-design="heatmap"] .strip{display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:16px}
[data-design="heatmap"] .strip .ml{font-family:"Space Mono",monospace;font-size:12px;color:var(--ink-2);letter-spacing:.08em;text-transform:uppercase}
[data-design="heatmap"] .strip .track{height:22px;background:var(--slate-2);border-radius:5px;overflow:hidden;position:relative}
[data-design="heatmap"] .strip .fill{height:100%;border-radius:5px}
[data-design="heatmap"] .strip .mk{font-family:"Space Mono",monospace;font-size:12px;color:var(--ink);min-width:80px;text-align:right}

/* feature */
[data-design="heatmap"] .feature{display:grid;grid-template-columns:1fr 0.62fr;gap:16px}
[data-design="heatmap"] .featmap{background:var(--abyss);border:1px solid var(--line);border-radius:8px;padding:10px}
[data-design="heatmap"] .featmap svg{display:block;width:100%;height:auto}
[data-design="heatmap"] .featmeta{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:22px;display:flex;flex-direction:column;gap:14px}
[data-design="heatmap"] .featmeta .name{font-size:20px;font-weight:600;letter-spacing:-.01em;line-height:1.15}
[data-design="heatmap"] .featmeta .when{font-family:"Space Mono",monospace;font-size:11px;color:var(--ink-3);margin-top:6px;letter-spacing:.04em}
[data-design="heatmap"] .featmeta .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
[data-design="heatmap"] .featmeta .f{border-top:1px solid var(--line);padding-top:8px}
[data-design="heatmap"] .featmeta .f .k{font-family:"Space Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.14em;text-transform:uppercase}
[data-design="heatmap"] .featmeta .f .v{font-family:"Space Mono",monospace;font-size:16px;font-weight:600;margin-top:3px}

/* ride list with thumbnails */
[data-design="heatmap"] .rlist{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}
[data-design="heatmap"] .rrow{display:grid;grid-template-columns:54px 1fr auto auto;align-items:center;gap:16px;padding:12px 16px;border-bottom:1px solid var(--line-2);text-decoration:none;color:var(--ink)}
[data-design="heatmap"] .rrow:last-child{border-bottom:0}
[data-design="heatmap"] .rrow:hover{background:var(--panel-2)}
[data-design="heatmap"] .rrow .thumb{background:var(--abyss);border-radius:5px;padding:3px}
[data-design="heatmap"] .rrow .thumb svg{display:block;width:100%;height:auto}
[data-design="heatmap"] .rrow .who .t{font-weight:600;font-size:14px}
[data-design="heatmap"] .rrow .who .d{font-family:"Space Mono",monospace;font-size:11px;color:var(--ink-3);margin-top:2px}
[data-design="heatmap"] .rrow .dist{font-family:"Space Mono",monospace;font-size:13px;text-align:right;min-width:64px}
[data-design="heatmap"] .rrow .heatdot{width:10px;height:10px;border-radius:50%}

[data-design="heatmap"] footer{padding:40px 0 56px;border-top:1px solid var(--line-2);display:flex;justify-content:space-between;font-family:"Space Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase}

@media (max-width:880px){
  [data-design="heatmap"] .stats{grid-template-columns:repeat(2,1fr)}
  [data-design="heatmap"] .hotzones{grid-template-columns:1fr}
  [data-design="heatmap"] .feature{grid-template-columns:1fr}
  [data-design="heatmap"] .legend{left:10px;bottom:10px}
  [data-design="heatmap"] .legend .lgbar{width:120px}
}
@media (prefers-reduced-motion:reduce){[data-design="heatmap"] *{animation:none!important;transition:none!important}}
`;

const MAP_W = 1000;
const MAP_H = 720;
const COLS = 18;
const ROWS = 13;

function heatColor(ratio: number): string {
  if (ratio <= 0) return "transparent";
  if (ratio < 0.18) return "#163050";
  if (ratio < 0.34) return "#2e6fae";
  if (ratio < 0.52) return "#0e7fd6";
  if (ratio < 0.68) return "#f97316";
  if (ratio < 0.85) return "#fc4c02";
  return "#ffd400";
}

export function HeatmapDesign() {
  const totals = useMemo(() => seasonTotals(), []);
  const paths = useMemo(() => heatmapPaths({ width: MAP_W, height: MAP_H, padding: 26 }), []);
  const bounds = useMemo(() => globalBounds(), []);
  const months = useMemo(() => monthly().filter((m) => m.month >= 2 && m.month <= 6), []);
  const { ride, detail } = useMemo(() => featured(), []);

  const featRoute = useMemo(
    () => projectRoute(detail.records, { width: 520, height: 360, padding: 16 }),
    [detail],
  );

  // density grid
  const { grid, maxCell, hotCells, occupied, totalPasses } = useMemo(() => {
    const g: number[][] = Array.from({ length: ROWS }).map(() =>
      Array.from({ length: COLS }).map(() => 0),
    );
    let maxC = 0;
    let passes = 0;
    const cellW = MAP_W / COLS;
    const cellH = MAP_H / ROWS;
    for (const p of paths) {
      for (const pt of p.pts) {
        const c = Math.min(COLS - 1, Math.max(0, Math.floor(pt.x / cellW)));
        const r = Math.min(ROWS - 1, Math.max(0, Math.floor(pt.y / cellH)));
        g[r]![c]! += 1;
        maxC = Math.max(maxC, g[r]![c]!);
        passes += 1;
      }
    }
    const cells: Array<{ r: number; c: number; count: number; ratio: number }> = [];
    let occ = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = g[r]![c]!;
        if (v > 0) occ += 1;
        cells.push({ r, c, count: v, ratio: v / Math.max(maxC, 1) });
      }
    }
    cells.sort((a, b) => b.count - a.count);
    return {
      grid: g,
      maxCell: maxC,
      hotCells: cells.slice(0, 3),
      occupied: occ,
      totalPasses: passes,
    };
  }, [paths]);

  const maxMonth = Math.max(1, ...months.map((m) => m.distanceMeters));
  const areaKm2 = bounds
    ? (bounds.maxLat - bounds.minLat) *
      111 *
      ((bounds.maxLon - bounds.minLon) * 111 * Math.cos((bounds.minLat * Math.PI) / 180))
    : 0;

  return (
    <div data-design="heatmap">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <Link to="/" className="brand">
            <span className="grad" aria-hidden="true" />
            <b>Ride-Lens · Heatmap</b>
          </Link>
          <nav className="topnav">
            <Link to="/1">01 Tarmac</Link>
            <Link to="/2">02 Zone</Link>
            <Link to="/3">03 Contour</Link>
            <Link to="/4">04 Mailhot</Link>
          </nav>
        </div>

        {/* HERO + MAP */}
        <section className="hero">
          <div className="eyebrow">Season {SEASON.year} · heat of your riding</div>
          <h1>
            The shape of <i>where</i> you ride.
          </h1>
          <p className="lede">
            {rides.length} routes layered on one map. The lines glow where they overlap — the roads
            you keep coming back to burn brightest. This is the season's true geography, not a
            single ride.
          </p>

          <div className="canvas">
            <span className="scalebadge mono">
              {rides.length} rides · {km(totals.distanceMeters)} km
            </span>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Heatmap of all rides">
              <defs>
                <filter id="heat-blur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.4" />
                </filter>
                <filter id="heat-soft" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.4" />
                </filter>
              </defs>
              {/* faint map graticule */}
              {Array.from({ length: 19 }).map((_, i) => (
                <line
                  key={`gv${i}`}
                  x1={(i * MAP_W) / 18}
                  y1="0"
                  x2={(i * MAP_W) / 18}
                  y2={MAP_H}
                  stroke="#0f1a2e"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <line
                  key={`gh${i}`}
                  x1="0"
                  y1={(i * MAP_H) / 13}
                  x2={MAP_W}
                  y2={(i * MAP_H) / 13}
                  stroke="#0f1a2e"
                  strokeWidth="1"
                />
              ))}

              {/* density underlay (heatmap cells) */}
              <g>
                {grid.map((row, r) =>
                  row.map((v, c) => {
                    if (v <= 0) return null;
                    const ratio = v / Math.max(maxCell, 1);
                    return (
                      <rect
                        key={`d${r}-${c}`}
                        x={(c * MAP_W) / COLS}
                        y={(r * MAP_H) / ROWS}
                        width={MAP_W / COLS}
                        height={MAP_H / ROWS}
                        fill={heatColor(ratio)}
                        opacity={0.22 + ratio * 0.4}
                      />
                    );
                  }),
                )}
              </g>

              {/* route glow layers */}
              <g style={{ mixBlendMode: "screen" }} filter="url(#heat-blur)">
                {paths.map((p) => (
                  <polyline
                    key={`halo-${p.id}`}
                    points={p.pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke="#fc4c02"
                    strokeWidth="6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.16"
                  />
                ))}
              </g>
              <g style={{ mixBlendMode: "screen" }} filter="url(#heat-soft)">
                {paths.map((p) => (
                  <polyline
                    key={`core-${p.id}`}
                    points={p.pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke="#ff8a3a"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                ))}
              </g>

              {/* start dots */}
              {paths.map((p) => {
                const s = p.pts[0];
                return s ? (
                  <circle key={`s-${p.id}`} cx={s.x} cy={s.y} r="3" fill="#ffd400" opacity="0.8" />
                ) : null;
              })}
            </svg>

            <div className="legend">
              <div className="lgbar" aria-hidden="true" />
              <div className="lglab">
                <span>fewer rides</span>
                <span>more rides</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section>
          <div className="stats">
            <div className="stat">
              <div className="k">Rides layered</div>
              <div className="v">{rides.length}</div>
              <div className="h">
                {paths.map((_, i) => (
                  <i
                    key={i}
                    style={{ height: `${20 + ((i * 37) % 80)}%`, opacity: 0.4 + (i % 3) * 0.2 }}
                  />
                ))}
              </div>
            </div>
            <div className="stat">
              <div className="k">Distance traced</div>
              <div className="v">
                {km(totals.distanceMeters)}
                <small>km</small>
              </div>
              <div className="h">
                {Array.from({ length: 14 }).map((_, i) => (
                  <i key={i} style={{ height: `${30 + ((i * 53) % 70)}%`, opacity: 0.5 }} />
                ))}
              </div>
            </div>
            <div className="stat">
              <div className="k">Distinct road cells</div>
              <div className="v">
                {occupied}
                <small>/ {COLS * ROWS}</small>
              </div>
              <div className="h">
                {Array.from({ length: occupied % 14 || 14 }).map((_, i) => (
                  <i key={i} style={{ height: `${40 + ((i * 29) % 60)}%` }} />
                ))}
              </div>
            </div>
            <div className="stat">
              <div className="k">Area ridden over</div>
              <div className="v">
                {areaKm2.toFixed(0)}
                <small>km²</small>
              </div>
              <div className="h">
                {Array.from({ length: 14 }).map((_, i) => (
                  <i key={i} style={{ height: `${20 + ((i * 41) % 80)}%`, opacity: 0.45 }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOT ZONES */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              Your most-ridden <b>ground.</b>
            </div>
            <div className="sec-sub">
              densest map cells · {totalPasses.toLocaleString()} GPS samples plotted
            </div>
          </div>
          <div className="hotzones">
            {hotCells.map((cell, i) => {
              const coord = bounds
                ? {
                    lat: bounds.maxLat - ((cell.r + 0.5) / ROWS) * (bounds.maxLat - bounds.minLat),
                    lon: bounds.minLon + ((cell.c + 0.5) / COLS) * (bounds.maxLon - bounds.minLon),
                  }
                : null;
              return (
                <div className="hz" key={i}>
                  <div className="rank mono">#{i + 1}</div>
                  <div className="coord">
                    {coord ? `${coord.lat.toFixed(4)}°N  ${coord.lon.toFixed(4)}°E` : "—"}
                  </div>
                  <div className="passes">
                    {cell.count}
                    <small>passes</small>
                  </div>
                  <div className="heatbar">
                    <i
                      style={{
                        width: `${Math.max(8, cell.ratio * 100)}%`,
                        background: heatColor(cell.ratio),
                      }}
                    />
                  </div>
                  <div className="lab">
                    cell {String.fromCharCode(65 + cell.c)}
                    {cell.r + 1} · heat {Math.round(cell.ratio * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* MONTHLY HEAT STRIPS */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Monthly mileage · heat</div>
            <div className="sec-sub">bar length ∝ km · colour ∝ share of peak</div>
          </div>
          <div className="strips">
            {months.map((m) => {
              const ratio = m.distanceMeters / maxMonth;
              return (
                <div className="strip" key={m.month}>
                  <div className="ml">{m.label}</div>
                  <div className="track">
                    <div
                      className="fill"
                      style={{
                        width: `${Math.max(2, ratio * 100)}%`,
                        background: `linear-gradient(90deg,#2e6fae, ${heatColor(ratio)})`,
                      }}
                    />
                  </div>
                  <div className="mk">
                    {km(m.distanceMeters)} km · {m.rideCount}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FEATURE */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              Brightest single trace · <b>{ride.filename.replace(/\.fit$/, "")}</b>
            </div>
            <div className="sec-sub">{dateLong(ride.summary.startTime)}</div>
          </div>
          <div className="feature">
            <div className="featmap">
              <svg viewBox="0 0 520 360" role="img" aria-label="Feature ride route">
                <defs>
                  <filter id="feat-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" />
                  </filter>
                </defs>
                {Array.from({ length: 9 }).map((_, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 45}
                    x2="520"
                    y2={i * 45}
                    stroke="#0f1a2e"
                    strokeWidth="1"
                  />
                ))}
                <polyline
                  points={featRoute.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#fc4c02"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.5"
                  filter="url(#feat-glow)"
                />
                <polyline
                  points={featRoute.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#ff8a3a"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {featRoute[0] ? (
                  <circle cx={featRoute[0].x} cy={featRoute[0].y} r="4" fill="#ffd400" />
                ) : null}
              </svg>
            </div>
            <div className="featmeta">
              <div>
                <div className="name">{ride.filename.replace(/\.fit$/, "").replace(/-/g, " ")}</div>
                <div className="when">{dateLong(ride.summary.startTime)}</div>
              </div>
              <div className="grid2">
                <Feat k="Distance" v={kmFull(ride.summary.totalDistanceMeters)} />
                <Feat k="Moving" v={duration(ride.summary.totalMovingSeconds)} />
                <Feat k="Avg pace" v={kmhFull(ride.summary.avgSpeedMetersPerSecond)} />
                <Feat k="Climbing" v={meters(ride.summary.totalAscentMeters)} />
              </div>
            </div>
          </div>
        </section>

        {/* RIDE LIST */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">All traces</div>
            <div className="sec-sub">{rides.length} routes · thumbnail per ride</div>
          </div>
          <div className="rlist">
            {[...rides].reverse().map((r, i) => (
              <RideRow key={r.id} ride={r} index={rides.length - i} />
            ))}
          </div>
        </section>

        <footer>
          <span>Heatmap · ride-lens · {SEASON.year}</span>
          <span>density from {totalPasses.toLocaleString()} GPS samples</span>
          <span>end of map</span>
        </footer>
      </div>
    </div>
  );
}

function Feat({ k, v }: { k: string; v: string }) {
  return (
    <div className="f">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function RideRow({ ride, index }: { ride: Ride; index: number }) {
  const pts = useMemo(
    () => projectRoute(rideDetail(ride.id)?.records ?? [], { width: 96, height: 56, padding: 4 }),
    [ride.id],
  );
  return (
    <Link to="/rides/$activityId" params={{ activityId: ride.id }} className="rrow">
      <div className="thumb">
        <svg viewBox="0 0 96 56" aria-hidden="true">
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#fc4c02"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>
      <div className="who">
        <div className="t">{ride.filename.replace(/\.fit$/, "")}</div>
        <div className="d">{dateLong(ride.summary.startTime)}</div>
      </div>
      <div className="dist">{km(ride.summary.totalDistanceMeters)} km</div>
      <div
        className="heatdot"
        style={{ background: index % 3 === 0 ? "#ffd400" : "#fc4c02" }}
        aria-hidden="true"
      />
    </Link>
  );
}
