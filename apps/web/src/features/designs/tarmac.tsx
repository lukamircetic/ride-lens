import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  SEASON,
  dateTime,
  duration,
  featured,
  kcal,
  km,
  kmFull,
  kmhFull,
  meters,
  monthly,
  profileArea,
  profilePath,
  projectRoute,
  rides,
  seasonBests,
  seasonTotals,
  type Ride,
} from "./mock";

/**
 * TARMAC — the visual language of the road itself.
 *
 * Display: Overpass (a typeface derived from the FHWA highway sign standard).
 * Palette: asphalt charcoal, road-paint white, traffic yellow, sign green.
 * Signature: the route is rendered as a painted road from above — white
 * edge line with a dashed yellow centre line — and the hero is a MUTCD-style
 * guide gantry listing the season's "destinations".
 */

const CSS = `
[data-design="tarmac"]{
  --asphalt:#1b1d21;
  --asphalt-2:#23262c;
  --asphalt-3:#2d3138;
  --paint:#f2efe6;
  --paint-dim:#bdb9ad;
  --yellow:#ffc72c;
  --yellow-dim:#c99a1e;
  --green:#0b5138;
  --green-edge:#0a3f2c;
  --red:#c8362c;
  background:var(--asphalt);
  color:var(--paint);
  font-family:"Overpass",system-ui,sans-serif;
  font-feature-settings:"tnum" 1,"ss01" 1;
  -webkit-font-smoothing:antialiased;
  min-height:100svh;
}
[data-design="tarmac"] *{box-sizing:border-box}
[data-design="tarmac"] .mono{font-family:"Overpass Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
[data-design="tarmac"] .wrap{max-width:1240px;margin:0 auto;padding:0 28px}
/* asphalt aggregate texture */
[data-design="tarmac"] .aggregate{
  background-image:
    radial-gradient(circle at 20% 30%,rgba(255,255,255,.018) 0 1px,transparent 1px),
    radial-gradient(circle at 70% 60%,rgba(255,255,255,.014) 0 1px,transparent 1px),
    radial-gradient(circle at 40% 80%,rgba(255,255,255,.02) 0 1px,transparent 1px),
    radial-gradient(circle at 85% 20%,rgba(255,255,255,.012) 0 1px,transparent 1px);
  background-size:46px 46px,37px 37px,53px 53px,29px 29px;
}
[data-design="tarmac"] .edge-rule{
  border-top:2px solid var(--paint);
  border-image:repeating-linear-gradient(90deg,var(--paint) 0 22px,transparent 22px 40px) 2;
}

/* top bar */
[data-design="tarmac"] .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid #000;box-shadow:inset 0 -2px 0 var(--yellow)}
[data-design="tarmac"] .brand{display:flex;align-items:center;gap:14px;letter-spacing:.18em;font-weight:800;font-size:13px;text-transform:uppercase}
[data-design="tarmac"] .brand .bolt{width:30px;height:30px;background:var(--yellow);color:#111;display:grid;place-items:center;font-weight:900;font-size:20px;line-height:1;clip-path:polygon(58% 0,12% 56%,44% 56%,30% 100%,88% 42%,54% 42%)}
[data-design="tarmac"] .topnav{display:flex;gap:6px}
[data-design="tarmac"] .topnav a{color:var(--paint-dim);text-decoration:none;font-size:12px;letter-spacing:.14em;text-transform:uppercase;padding:6px 10px;border:1px solid transparent}
[data-design="tarmac"] .topnav a:hover{border-color:var(--paint);color:var(--paint)}

/* hero */
[data-design="tarmac"] .hero{padding:48px 0 32px}
[data-design="tarmac"] .eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--yellow);font-weight:700}
[data-design="tarmac"] .eyebrow::before{content:"";width:42px;height:3px;background:var(--yellow)}
[data-design="tarmac"] .hero h1{
  font-weight:900;font-size:clamp(40px,7vw,86px);line-height:.92;letter-spacing:-.02em;margin:18px 0 0;text-transform:uppercase;
}
[data-design="tarmac"] .hero h1 em{font-style:normal;color:var(--yellow)}
[data-design="tarmac"] .hero p{max-width:46ch;margin:20px 0 0;color:var(--paint-dim);font-size:16px;line-height:1.55}

/* gantry sign */
[data-design="tarmac"] .gantry{
  margin-top:38px;background:var(--green);color:#fff;border:4px solid #fff;
  box-shadow:0 0 0 4px var(--green-edge),0 22px 50px rgba(0,0,0,.45);
  border-radius:8px;overflow:hidden;
}
[data-design="tarmac"] .gantry-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;padding:18px 26px;border-top:2px solid rgba(255,255,255,.85)}
[data-design="tarmac"] .gantry-row:first-child{border-top:0}
[data-design="tarmac"] .gantry-dest{display:flex;align-items:center;gap:16px;font-size:clamp(15px,1.6vw,19px);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
[data-design="tarmac"] .arrow{flex:0 0 auto;color:#fff;opacity:.92}
[data-design="tarmac"] .gantry-val{font-family:"Overpass Mono",monospace;font-weight:800;font-size:clamp(22px,3vw,34px);letter-spacing:.02em;white-space:nowrap}
[data-design="tarmac"] .gantry-val small{font-size:.5em;font-weight:600;opacity:.8;margin-left:6px}

/* aux signs strip */
[data-design="tarmac"] .signs{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:32px}
[data-design="tarmac"] .sign{background:var(--asphalt-2);border:2px solid var(--paint);border-radius:6px;padding:18px 18px 20px;position:relative}
[data-design="tarmac"] .sign .lbl{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--paint-dim);font-weight:700}
[data-design="tarmac"] .sign .num{font-family:"Overpass Mono",monospace;font-weight:800;font-size:30px;letter-spacing:.01em;margin-top:8px;line-height:1}
[data-design="tarmac"] .sign .num small{font-size:.42em;margin-left:6px;color:var(--paint-dim);font-weight:600}
[data-design="tarmac"] .sign .cap{margin-top:10px;font-size:12px;color:var(--paint-dim)}
[data-design="tarmac"] .sign.yellow{border-color:var(--yellow)}
[data-design="tarmac"] .sign.yellow .num{color:var(--yellow)}

/* map */
[data-design="tarmac"] .section{padding:56px 0;border-top:1px solid #000}
[data-design="tarmac"] .sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:26px;flex-wrap:wrap}
[data-design="tarmac"] .sec-title{font-size:13px;letter-spacing:.24em;text-transform:uppercase;font-weight:800}
[data-design="tarmac"] .sec-title b{color:var(--yellow)}
[data-design="tarmac"] .sec-sub{font-family:"Overpass Mono",monospace;font-size:12px;color:var(--paint-dim);letter-spacing:.06em}

[data-design="tarmac"] .map-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:0;border:1px solid #000;background:var(--asphalt)}
[data-design="tarmac"] .map-stage{padding:18px}
[data-design="tarmac"] .map-meta{border-left:1px solid #000;padding:22px;background:var(--asphalt-2);display:flex;flex-direction:column;gap:14px}
[data-design="tarmac"] .map-meta .name{font-weight:800;font-size:20px;line-height:1.15;text-transform:uppercase;letter-spacing:.01em}
[data-design="tarmac"] .map-meta .when{font-family:"Overpass Mono",monospace;font-size:12px;color:var(--paint-dim);letter-spacing:.05em}
[data-design="tarmac"] .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
[data-design="tarmac"] .field{border-top:1px solid #3a3f47;padding-top:10px}
[data-design="tarmac"] .field .k{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--paint-dim);font-weight:700}
[data-design="tarmac"] .field .v{font-family:"Overpass Mono",monospace;font-weight:700;font-size:18px;margin-top:4px}

/* profiles */
[data-design="tarmac"] .profiles{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:0;border-top:0}
[data-design="tarmac"] .profile{background:var(--asphalt);padding:22px;border-right:1px solid #000}
[data-design="tarmac"] .profile:last-child{border-right:0}
[data-design="tarmac"] .profile .pl{display:flex;justify-content:space-between;align-items:baseline}
[data-design="tarmac"] .profile .pl span{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--paint-dim);font-weight:700}
[data-design="tarmac"] .profile .pl b{font-family:"Overpass Mono",monospace;font-size:14px;font-weight:700}

/* monthly ladder */
[data-design="tarmac"] .months{display:grid;grid-template-columns:repeat(12,1fr);gap:10px;margin-top:8px}
[data-design="tarmac"] .month{display:flex;flex-direction:column;gap:8px}
[data-design="tarmac"] .track{height:150px;background:var(--asphalt-2);border:1px solid #000;position:relative;display:flex;align-items:flex-end;padding:6px}
[data-design="tarmac"] .bar{width:100%;background:repeating-linear-gradient(180deg,var(--yellow) 0 10px,#000 10px 12px);box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)}
[data-design="tarmac"] .month .ml{display:flex;justify-content:space-between;font-family:"Overpass Mono",monospace;font-size:11px;color:var(--paint-dim)}
[data-design="tarmac"] .month .ml b{color:var(--paint);font-weight:700}

/* exit sign list */
[data-design="tarmac"] .exits{display:flex;flex-direction:column}
[data-design="tarmac"] .exit{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:22px;padding:18px 4px;border-top:1px solid #2a2d33;text-decoration:none;color:inherit}
[data-design="tarmac"] .exit:last-child{border-bottom:1px solid #2a2d33}
[data-design="tarmac"] .exit:hover{background:linear-gradient(90deg,rgba(255,199,44,.07),transparent)}
[data-design="tarmac"] .exit .idx{font-family:"Overpass Mono",monospace;font-size:13px;color:var(--yellow);font-weight:700;width:42px}
[data-design="tarmac"] .exit .where .t{font-weight:800;text-transform:uppercase;letter-spacing:.02em;font-size:16px}
[data-design="tarmac"] .exit .where .d{font-family:"Overpass Mono",monospace;font-size:12px;color:var(--paint-dim);margin-top:3px;letter-spacing:.04em}
[data-design="tarmac"] .pill{font-family:"Overpass Mono",monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border:1px solid var(--paint-dim);color:var(--paint-dim)}
[data-design="tarmac"] .exitdist{background:var(--green);color:#fff;border:2px solid #fff;border-radius:4px;padding:8px 14px;font-family:"Overpass Mono",monospace;font-weight:800;font-size:15px;box-shadow:0 0 0 2px var(--green-edge)}

[data-design="tarmac"] footer{padding:40px 0 60px;border-top:1px solid #000;margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--paint-dim)}
[data-design="tarmac"] footer .bolt{width:22px;height:22px;background:var(--yellow);clip-path:polygon(58% 0,12% 56%,44% 56%,30% 100%,88% 42%,54% 42%)}

@media (max-width:900px){
  [data-design="tarmac"] .signs{grid-template-columns:repeat(2,1fr)}
  [data-design="tarmac"] .map-grid{grid-template-columns:1fr}
  [data-design="tarmac"] .map-meta{border-left:0;border-top:1px solid #000}
  [data-design="tarmac"] .profiles{grid-template-columns:1fr}
  [data-design="tarmac"] .profile{border-right:0;border-bottom:1px solid #000}
  [data-design="tarmac"] .months{grid-template-columns:repeat(6,1fr)}
  [data-design="tarmac"] .exit{grid-template-columns:auto 1fr;row-gap:8px}
  [data-design="tarmac"] .pill,.exitdist{grid-column:2}
}
@media (prefers-reduced-motion:reduce){[data-design="tarmac"] *{animation:none!important;transition:none!important}}
`;

const MAP_W = 1000;
const MAP_H = 560;

export function TarmacDesign() {
  const totals = useMemo(() => seasonTotals(), []);
  const bests = useMemo(() => seasonBests(), []);
  const { ride, detail } = useMemo(() => featured(), []);
  const months = useMemo(() => monthly().filter((m) => m.month >= 2 && m.month <= 6), []);
  const records = detail.records;

  const route = useMemo(
    () => projectRoute(records, { width: MAP_W, height: MAP_H, padding: 46 }),
    [records],
  );
  const elev = useMemo(
    () => records.map((r) => r.altitudeMeters ?? 0).filter((v) => v > 0),
    [records],
  );
  const speed = useMemo(() => records.map((r) => (r.speedMetersPerSecond ?? 0) * 3.6), [records]);
  const hr = useMemo(() => records.map((r) => r.heartRateBpm ?? 0).filter((v) => v > 0), [records]);

  const steepIdx = useMemo(() => {
    let best = 0;
    let bestV = -Infinity;
    records.forEach((r, i) => {
      if ((r.gradePercent ?? 0) > bestV) {
        bestV = r.gradePercent ?? 0;
        best = i;
      }
    });
    return { i: best, v: bestV };
  }, [records]);

  const maxMonth = Math.max(1, ...months.map((m) => m.distanceMeters));

  const routeLine = route.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const steepPt = route[Math.min(steepIdx.i, route.length - 1)] ?? null;

  return (
    <div data-design="tarmac" className="aggregate">
      <style>{CSS}</style>
      <div className="wrap">
        <TopBar />

        <section className="hero">
          <span className="eyebrow">Season {SEASON.year} · Tarmac report</span>
          <h1>
            Every kilometre,
            <br />
            <em>signed &amp; counted.</em>
          </h1>
          <p>
            A road-side read on {totals.rideCount} rides from {SEASON.title.toLowerCase()}.
            Distance, pace and elevation are written the way the road writes them — in paint, on
            asphalt, in numbers you can trust.
          </p>

          <div className="gantry" role="group" aria-label="Season totals">
            <GantryRow label="Total distance" value={km(totals.distanceMeters)} unit="km" />
            <GantryRow label="Time in the saddle" value={duration(totals.movingSeconds)} />
            <GantryRow label="Vertical gained" value={meters(totals.ascentMeters)} unit="m" />
          </div>

          <div className="signs">
            <div className="sign yellow">
              <div className="lbl">Rides logged</div>
              <div className="num">{totals.rideCount}</div>
              <div className="cap">
                since {months[0] ? monthName(months[0]!.month) : ""} {SEASON.year}
              </div>
            </div>
            <div className="sign">
              <div className="lbl">Average pace</div>
              <div className="num">
                {(totals.avgSpeedMetersPerSecond * 3.6).toFixed(1)}
                <small>km/h</small>
              </div>
              <div className="cap">distance-weighted</div>
            </div>
            <div className="sign">
              <div className="lbl">Top speed</div>
              <div className="num">
                {(totals.maxSpeedMetersPerSecond * 3.6).toFixed(1)}
                <small>km/h</small>
              </div>
              <div className="cap">season maximum</div>
            </div>
            <div className="sign">
              <div className="lbl">Energy burned</div>
              <div className="num">
                {kcal(totals.calories)}
                <small>kcal</small>
              </div>
              <div className="cap">
                ≈ {Math.round((totals.calories / 540) * 10) / 10} kg CO₂ saved vs driving
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED ROUTE */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              <b>★</b> Feature ride · painted route
            </div>
            <div className="sec-sub">
              {records.length} GPS points · {ride.summary.recordCount} records
            </div>
          </div>

          <div className="map-grid">
            <div className="map-stage aggregate">
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                role="img"
                aria-label="Route of feature ride"
                style={{ width: "100%", height: "auto", display: "block" }}
              >
                <defs>
                  <pattern id="tarmac-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="#000" strokeWidth="1" opacity="0.5" />
                  </pattern>
                </defs>
                <rect width={MAP_W} height={MAP_H} fill="url(#tarmac-grid)" opacity="0.6" />
                {/* the road: white edge + dashed yellow centre along the same path */}
                <polyline
                  points={routeLine}
                  fill="none"
                  stroke="#f2efe6"
                  strokeWidth="11"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.95"
                />
                <polyline
                  points={routeLine}
                  fill="none"
                  stroke="#1b1d21"
                  strokeWidth="7"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  points={routeLine}
                  fill="none"
                  stroke="#ffc72c"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="2 10"
                />
                {/* reflectors */}
                {route[0] ? (
                  <circle
                    cx={route[0].x}
                    cy={route[0].y}
                    r="6"
                    fill="#f2efe6"
                    stroke="#1b1d21"
                    strokeWidth="2"
                  />
                ) : null}
                {route.at(-1) ? (
                  <circle
                    cx={route.at(-1)!.x}
                    cy={route.at(-1)!.y}
                    r="6"
                    fill="#ffc72c"
                    stroke="#1b1d21"
                    strokeWidth="2"
                  />
                ) : null}
                {/* steep grade chevron */}
                {steepPt ? (
                  <g transform={`translate(${steepPt.x} ${steepPt.y})`}>
                    <path
                      d="M0 0 L26 -40 M0 0 L-26 -40"
                      stroke="#c8362c"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <g transform="translate(0 26)">
                      <rect x="-58" y="-13" width="116" height="24" rx="3" fill="#c8362c" />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontFamily="Overpass Mono, monospace"
                        fontSize="13"
                        fontWeight="800"
                        fill="#fff"
                      >
                        {Math.max(0, steepIdx.v).toFixed(0)}% GRADE
                      </text>
                    </g>
                  </g>
                ) : null}
              </svg>
            </div>

            <div className="map-meta">
              <div>
                <div className="name">{ride.filename.replace(/\.fit$/, "").replace(/-/g, " ")}</div>
                <div className="when">{dateTime(ride.summary.startTime)}</div>
              </div>
              <div className="grid2">
                <Field k="Distance" v={kmFull(ride.summary.totalDistanceMeters)} />
                <Field k="Moving" v={duration(ride.summary.totalMovingSeconds)} />
                <Field k="Avg pace" v={kmhFull(ride.summary.avgSpeedMetersPerSecond)} />
                <Field k="Max pace" v={kmhFull(ride.summary.maxSpeedMetersPerSecond)} />
                <Field k="Climbing" v={meters(ride.summary.totalAscentMeters)} />
                <Field k="Avg HR" v={`${ride.summary.avgHeartRateBpm ?? 0} bpm`} />
              </div>
              <div className="grid2">
                <Field k="Avg power" v={`${ride.summary.avgPowerWatts ?? 0} W`} />
                <Field k="Cadence" v={`${ride.summary.avgCadenceRpm ?? 0} rpm`} />
              </div>
            </div>
          </div>

          <div className="profiles">
            <ProfileCard
              label="Elevation"
              unit="m"
              value={meters(maxArr(elev))}
              path={profileArea(elev, { width: 600, height: 140 })}
              fill="#3a4a2e"
              stroke="#9fc16a"
            />
            <ProfileCard
              label="Speed"
              unit="km/h"
              value={`${maxArr(speed).toFixed(1)}`}
              path={profilePath(speed, { width: 600, height: 140 })}
              fill="none"
              stroke="#ffc72c"
            />
            <ProfileCard
              label="Heart rate"
              unit="bpm"
              value={`${maxArr(hr)}`}
              path={profilePath(hr, { width: 600, height: 140 })}
              fill="none"
              stroke="#c8362c"
            />
          </div>
        </section>

        {/* RECORDS / BESTS */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Road records</div>
            <div className="sec-sub">longest · fastest · highest · latest</div>
          </div>
          {bests ? (
            <div className="signs">
              <RecordSign
                mark="▲"
                label="Longest ride"
                ride={bests.longest}
                metric={kmFull(bests.longest.summary.totalDistanceMeters)}
              />
              <RecordSign
                mark="»"
                label="Fastest avg"
                ride={bests.fastest}
                metric={kmhFull(bests.fastest.summary.avgSpeedMetersPerSecond)}
              />
              <RecordSign
                mark="↑"
                label="Most climbing"
                ride={bests.climbiest}
                metric={meters(bests.climbiest.summary.totalAscentMeters)}
              />
              <RecordSign
                mark="●"
                label="Latest"
                ride={bests.mostRecent}
                metric={kmFull(bests.mostRecent.summary.totalDistanceMeters)}
              />
            </div>
          ) : null}
        </section>

        {/* MONTHLY */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Distance by month</div>
            <div className="sec-sub">
              road-paint bars · {kmFull(months.reduce((s, m) => s + m.distanceMeters, 0))} total
            </div>
          </div>
          <div className="months">
            {months.map((m) => {
              const h = Math.max(6, (m.distanceMeters / maxMonth) * 100);
              return (
                <div className="month" key={m.month}>
                  <div className="track">
                    <div
                      className="bar"
                      style={{ height: `${h}%` }}
                      aria-label={`${m.label} ${km(m.distanceMeters)} km`}
                    />
                  </div>
                  <div className="ml">
                    <span>{m.label}</span>
                    <b>{km(m.distanceMeters)}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIDE LIST */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Exit list · all rides</div>
            <div className="sec-sub">{rides.length} signed</div>
          </div>
          <div className="exits">
            {[...rides].reverse().map((r, i) => (
              <ExitRow key={r.id} ride={r} index={rides.length - i} />
            ))}
          </div>
        </section>

        <footer>
          <span className="bolt" aria-hidden="true" />
          <span>Tarmac · ride-lens · {SEASON.year}</span>
          <span>{km(totals.distanceMeters)} km &amp; counting</span>
        </footer>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="topbar">
      <Link to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="bolt" aria-hidden="true">
          ⚡
        </span>
        <span>Tarmac / Ride-Lens</span>
      </Link>
      <nav className="topnav">
        <Link to="/2">02 Zone</Link>
        <Link to="/3">03 Contour</Link>
        <Link to="/4">04 Mailhot</Link>
        <Link to="/5">05 Heatmap</Link>
      </nav>
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

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="field">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function ProfileCard({
  label,
  unit,
  value,
  path,
  fill,
  stroke,
}: {
  label: string;
  unit: string;
  value: string;
  path: string;
  fill: string;
  stroke: string;
}) {
  return (
    <div className="profile">
      <div className="pl">
        <span>{label}</span>
        <b>
          peak {value} {unit}
        </b>
      </div>
      <svg
        viewBox="0 0 600 150"
        style={{ width: "100%", height: "auto", marginTop: 16, display: "block" }}
        role="img"
        aria-label={`${label} profile`}
      >
        <line x1="0" y1="146" x2="600" y2="146" stroke="#000" strokeWidth="2" />
        {path ? (
          <path
            d={path}
            fill={fill}
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </div>
  );
}

function RecordSign({
  mark,
  label,
  ride,
  metric,
}: {
  mark: string;
  label: string;
  ride: Ride;
  metric: string;
}) {
  return (
    <div className="sign yellow">
      <div className="lbl">
        <span aria-hidden="true">{mark}</span> {label}
      </div>
      <div className="num">{metric}</div>
      <div className="cap">{dateTime(ride.summary.startTime)}</div>
    </div>
  );
}

function ExitRow({ ride, index }: { ride: Ride; index: number }) {
  const type = ride.summary.subSport ?? "road";
  return (
    <Link to="/rides/$activityId" params={{ activityId: ride.id }} className="exit">
      <div className="idx">{String(index).padStart(2, "0")}</div>
      <div className="where">
        <div className="t">{ride.filename.replace(/\.fit$/, "").replace(/-/g, " ")}</div>
        <div className="d">{dateTime(ride.summary.startTime)}</div>
      </div>
      <div className="pill">{type}</div>
      <div className="exitdist">{km(ride.summary.totalDistanceMeters)} km</div>
    </Link>
  );
}

function monthName(m: number): string {
  return (
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] ?? ""
  );
}

function maxArr(a: ReadonlyArray<number>): number {
  return a.length ? Math.max(...a) : 0;
}
