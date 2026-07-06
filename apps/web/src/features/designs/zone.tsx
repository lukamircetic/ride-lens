import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  SEASON,
  dateLong,
  duration,
  featured,
  km,
  kmFull,
  meters,
  monthly,
  rideZones,
  rides,
  seasonTotals,
  seasonZones,
  HR_MAX,
} from "./mock";

/**
 * ZONE — the season told in training zones.
 *
 * Display: Space Grotesk (display + body) + JetBrains Mono (data).
 * Palette: a clinical light field with the Z1–Z7 effort gradient
 * (slate → blue → green → yellow → orange → red → deep red) as the identity.
 * Signature: a radial "season in zones" dial — where your time actually went.
 */

const ZONES = [
  { n: "Z1", name: "Recovery", color: "#6B7280" },
  { n: "Z2", name: "Endurance", color: "#3B82F6" },
  { n: "Z3", name: "Tempo", color: "#22C55E" },
  { n: "Z4", name: "Threshold", color: "#EAB308" },
  { n: "Z5", name: "VO₂ max", color: "#F97316" },
  { n: "Z6", name: "Anaerobic", color: "#EF4444" },
  { n: "Z7", name: "Neuromuscular", color: "#991B1B" },
] as const;

const CSS = `
[data-design="zone"]{
  --bg:#f5f6f4;
  --panel:#ffffff;
  --ink:#14161a;
  --ink-2:#5b6168;
  --ink-3:#8b9197;
  --rule:#e4e7e9;
  --rule-2:#eceef0;
  --track:#eef0ee;
  background:var(--bg);
  color:var(--ink);
  font-family:"Space Grotesk",system-ui,sans-serif;
  font-feature-settings:"tnum" 1,"ss01" 1;
  -webkit-font-smoothing:antialiased;
  min-height:100svh;
}
[data-design="zone"] *{box-sizing:border-box}
[data-design="zone"] .mono{font-family:"JetBrains Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
[data-design="zone"] .wrap{max-width:1240px;margin:0 auto;padding:0 28px}

[data-design="zone"] .topbar{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid var(--rule)}
[data-design="zone"] .brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink)}
[data-design="zone"] .brand .swatch{width:18px;height:18px;border-radius:4px;background:conic-gradient(#6B7280 0 12%,#3B82F6 12% 30%,#22C55E 30% 48%,#EAB308 48% 62%,#F97316 62% 76%,#EF4444 76% 90%,#991B1B 90% 100%)}
[data-design="zone"] .brand b{font-weight:700;font-size:15px;letter-spacing:-.01em}
[data-design="zone"] .topnav{display:flex;gap:16px}
[data-design="zone"] .topnav a{font-size:13px;color:var(--ink-2);text-decoration:none}
[data-design="zone"] .topnav a:hover{color:var(--ink)}

/* hero */
[data-design="zone"] .hero{padding:50px 0 24px;display:grid;grid-template-columns:1fr 0.9fr;gap:48px;align-items:center}
[data-design="zone"] .eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}
[data-design="zone"] .eyebrow b{color:#ef4444}
[data-design="zone"] .hero h1{font-weight:600;font-size:clamp(38px,5.4vw,64px);line-height:1;margin:18px 0 0;letter-spacing:-.025em}
[data-design="zone"] .hero h1 i{font-style:normal;background:linear-gradient(90deg,#3B82F6,#F97316 60%,#EF4444);-webkit-background-clip:text;background-clip:text;color:transparent}
[data-design="zone"] .hero p{margin:22px 0 0;color:var(--ink-2);font-size:16px;line-height:1.6;max-width:44ch}

[data-design="zone"] .keystats{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:30px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
[data-design="zone"] .keystats .ks{padding:14px 0;border-right:1px solid var(--rule)}
[data-design="zone"] .keystats .ks:last-child{border-right:0}
[data-design="zone"] .keystats .ks .k{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
[data-design="zone"] .keystats .ks .v{font-size:22px;font-weight:600;margin-top:6px;letter-spacing:-.01em}
[data-design="zone"] .keystats .ks .v small{font-size:12px;color:var(--ink-2);font-weight:400;margin-left:3px}

/* radial dial */
[data-design="zone"] .dial{position:relative;display:grid;place-items:center}
[data-design="zone"] .dial svg{width:100%;max-width:440px;height:auto;display:block}
[data-design="zone"] .dial .center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none}
[data-design="zone"] .dial .center .big{font-size:clamp(40px,5vw,58px);font-weight:700;line-height:1;letter-spacing:-.03em}
[data-design="zone"] .dial .center .lab{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-top:6px}
[data-design="zone"] .dial .center .sub{font-size:13px;color:var(--ink-2);margin-top:10px;max-width:18ch}

/* zone legend */
[data-design="zone"] .section{padding:48px 0;border-top:1px solid var(--rule)}
[data-design="zone"] .sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:22px;flex-wrap:wrap}
[data-design="zone"] .sec-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
[data-design="zone"] .sec-title b{color:#f97316}
[data-design="zone"] .sec-sub{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.06em}

[data-design="zone"] .zlegend{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
[data-design="zone"] .zcard{background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:14px 12px;position:relative;overflow:hidden}
[data-design="zone"] .zcard .bar{position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--zc)}
[data-design="zone"] .zcard .zn{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.08em}
[data-design="zone"] .zcard .zn b{color:var(--ink)}
[data-design="zone"] .zcard .zname{font-size:13px;font-weight:600;margin-top:2px}
[data-design="zone"] .zcard .zpct{font-size:22px;font-weight:700;margin-top:10px;letter-spacing:-.02em}
[data-design="zone"] .zcard .zhrs{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-2);margin-top:2px}

/* stacked season bar */
[data-design="zone"] .stacked{background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:22px}
[data-design="zone"] .stacked .lab{display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
[data-design="zone"] .bar-track{display:flex;height:42px;border-radius:6px;overflow:hidden;background:var(--track)}
[data-design="zone"] .bar-seg{height:100%;transition:filter .2s}
[data-design="zone"] .bar-seg:hover{filter:brightness(.92)}
[data-design="zone"] .bar-axis{display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-3);margin-top:8px}

/* feature ride */
[data-design="zone"] .feature{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--panel)}
[data-design="zone"] .feature .left{padding:24px;border-right:1px solid var(--rule)}
[data-design="zone"] .feature .right{padding:24px;background:#fbfbfa}
[data-design="zone"] .feature .name{font-size:20px;font-weight:600;letter-spacing:-.01em;line-height:1.15}
[data-design="zone"] .feature .when{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);margin-top:6px;letter-spacing:.04em}
[data-design="zone"] .feature .fstats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
[data-design="zone"] .feature .fstat{border-top:1px solid var(--rule);padding-top:8px}
[data-design="zone"] .feature .fstat .k{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-3);letter-spacing:.14em;text-transform:uppercase}
[data-design="zone"] .feature .fstat .v{font-family:"JetBrains Mono",monospace;font-size:16px;font-weight:600;margin-top:3px}

[data-design="zone"] .iflabel{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase}
[data-design="zone"] .ifactor{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:4px 0 14px}
[data-design="zone"] .mini-zone{display:flex;height:26px;border-radius:5px;overflow:hidden;background:var(--track)}
[data-design="zone"] .mini-zone .seg{height:100%}

/* monthly */
[data-design="zone"] .months{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
[data-design="zone"] .mcol{background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:14px}
[data-design="zone"] .mcol .mh{display:flex;justify-content:space-between;align-items:baseline}
[data-design="zone"] .mcol .mh .ml{font-weight:600;font-size:14px}
[data-design="zone"] .mcol .mh .mv{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3)}
[data-design="zone"] .mtrack{height:120px;display:flex;align-items:flex-end;margin-top:12px;border-radius:4px}
[data-design="zone"] .mbar{width:100%;border-radius:3px 3px 0 0}
[data-design="zone"] .mcol .mfoot{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-3);margin-top:8px;letter-spacing:.06em}

/* ride list */
[data-design="zone"] .rlist{background:var(--panel);border:1px solid var(--rule);border-radius:8px;overflow:hidden}
[data-design="zone"] .rrow{display:grid;grid-template-columns:auto 1fr auto auto auto;align-items:center;gap:16px;padding:14px 18px;border-bottom:1px solid var(--rule-2);text-decoration:none;color:var(--ink)}
[data-design="zone"] .rrow:last-child{border-bottom:0}
[data-design="zone"] .rrow:hover{background:#fbfbfa}
[data-design="zone"] .rrow .idx{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--ink-3);width:30px}
[data-design="zone"] .rrow .who .t{font-weight:600;font-size:14px}
[data-design="zone"] .rrow .who .d{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);margin-top:2px}
[data-design="zone"] .rrow .mz{width:120px;height:10px;display:flex;border-radius:3px;overflow:hidden;background:var(--track)}
[data-design="zone"] .rrow .mz .s{height:100%}
[data-design="zone"] .rrow .dist{font-family:"JetBrains Mono",monospace;font-size:13px;text-align:right;min-width:60px}
[data-design="zone"] .rrow .ifc{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);width:42px;text-align:right}

[data-design="zone"] footer{padding:40px 0 56px;border-top:1px solid var(--rule);margin-top:0;display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase}

@media (max-width:880px){
  [data-design="zone"] .hero{grid-template-columns:1fr;gap:32px}
  [data-design="zone"] .zlegend{grid-template-columns:repeat(4,1fr)}
  [data-design="zone"] .feature{grid-template-columns:1fr}
  [data-design="zone"] .feature .left{border-right:0;border-bottom:1px solid var(--rule)}
  [data-design="zone"] .months{grid-template-columns:repeat(2,1fr)}
  [data-design="zone"] .rrow{grid-template-columns:auto 1fr auto;row-gap:8px}
  [data-design="zone"] .rrow .mz,.rrow .ifc{grid-column:2/4}
}
@media (prefers-reduced-motion:reduce){[data-design="zone"] *{animation:none!important;transition:none!important}}
`;

export function ZoneDesign() {
  const totals = useMemo(() => seasonTotals(), []);
  const zones = useMemo(() => seasonZones(), []);
  const { ride } = useMemo(() => featured(), []);
  const featZones = useMemo(() => rideZones(ride.id), [ride.id]);
  const months = useMemo(() => monthly().filter((m) => m.month >= 2 && m.month <= 6), []);

  const zoneTotal = zones.reduce((s, z) => s + z, 0) || 1;
  const zonePct = zones.map((z) => (z / zoneTotal) * 100);
  const dominantIdx = zones.indexOf(Math.max(...zones));

  const maxMonth = Math.max(1, ...months.map((m) => m.distanceMeters));

  // rides with per-ride zone micro-bars + intensity (dominant zone)
  const rows = useMemo(
    () =>
      [...rides].reverse().map((r, i) => {
        const z = rideZones(r.id);
        const tot = z.reduce((s, v) => s + v, 0) || 1;
        const dom = z.indexOf(Math.max(...z));
        return { ride: r, idx: rides.length - i, zones: z, tot, dom };
      }),
    [],
  );

  return (
    <div data-design="zone">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <Link to="/" className="brand">
            <span className="swatch" aria-hidden="true" />
            <b>Ride-Lens · Zone</b>
          </Link>
          <nav className="topnav">
            <Link to="/1">01 Tarmac</Link>
            <Link to="/3">03 Contour</Link>
            <Link to="/4">04 Mailhot</Link>
            <Link to="/5">05 Heatmap</Link>
          </nav>
        </div>

        {/* HERO */}
        <section className="hero">
          <div>
            <div className="eyebrow">
              Season {SEASON.year} · <b>training-load analysis</b>
            </div>
            <h1>
              Where the
              <br />
              <i>watts went.</i>
            </h1>
            <p>
              Every ride broken into seven heart-rate zones, measured against a {HR_MAX} bpm max.
              The dial on the right is the whole season at a glance — the honest answer to "do I
              actually ride hard, or just a lot?"
            </p>

            <div className="keystats">
              <div className="ks">
                <div className="k">Time trained</div>
                <div className="v">{duration(totals.movingSeconds)}</div>
              </div>
              <div className="ks">
                <div className="k">Mean pace</div>
                <div className="v">
                  {(totals.avgSpeedMetersPerSecond * 3.6).toFixed(1)}
                  <small>km/h</small>
                </div>
              </div>
              <div className="ks">
                <div className="k">Energy</div>
                <div className="v">
                  {Math.round(totals.calories / 1000)}
                  <small>M kcal</small>
                </div>
              </div>
            </div>
          </div>

          {/* RADIAL DIAL */}
          <div className="dial">
            <ZoneDial zones={zones} zoneTotal={zoneTotal} />
            <div className="center">
              <div>
                <div className="big">
                  {(zoneTotal / 3600).toFixed(1)}
                  <span style={{ fontSize: ".42em", color: "var(--ink-3)" }}>h</span>
                </div>
                <div className="lab">Time in zone</div>
                <div className="sub">
                  mostly{" "}
                  <b style={{ color: ZONES[dominantIdx]!.color }}>
                    {ZONES[dominantIdx]!.n} {ZONES[dominantIdx]!.name}
                  </b>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ZONE LEGEND */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              The seven <b>zones.</b>
            </div>
            <div className="sec-sub">% of season time · hours each</div>
          </div>
          <div className="zlegend">
            {ZONES.map((z, i) => (
              <div className="zcard" key={z.n} style={{ ["--zc" as string]: z.color }}>
                <div className="bar" aria-hidden="true" />
                <div className="zn">
                  <b>{z.n}</b>
                </div>
                <div className="zname">{z.name}</div>
                <div className="zpct">{zonePct[i]!.toFixed(0)}%</div>
                <div className="zhrs">{duration(zones[i])}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SEASON STACKED BAR */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Season, stacked by effort</div>
            <div className="sec-sub">one bar · the whole year</div>
          </div>
          <div className="stacked">
            <div className="lab">
              <span>0%</span>
              <span>time distribution</span>
              <span>100%</span>
            </div>
            <div className="bar-track">
              {ZONES.map((z, i) =>
                zonePct[i]! > 0.3 ? (
                  <div
                    key={z.n}
                    className="bar-seg"
                    style={{ width: `${zonePct[i]}%`, background: z.color }}
                    title={`${z.n} ${z.name}: ${zonePct[i]!.toFixed(1)}%`}
                  />
                ) : null,
              )}
            </div>
            <div className="bar-axis">
              {ZONES.map((z) => (
                <span key={z.n} style={{ color: z.color }}>
                  {z.n}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE RIDE */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">
              Feature ride · <b>{ride.filename.replace(/\.fit$/, "")}</b>
            </div>
            <div className="sec-sub">{dateLong(ride.summary.startTime)}</div>
          </div>
          <div className="feature">
            <div className="left">
              <div className="name">{ride.filename.replace(/\.fit$/, "").replace(/-/g, " ")}</div>
              <div className="when">{dateLong(ride.summary.startTime)} · the long one</div>
              <div className="fstats">
                <FStat k="Distance" v={kmFull(ride.summary.totalDistanceMeters)} />
                <FStat k="Moving" v={duration(ride.summary.totalMovingSeconds)} />
                <FStat k="Avg HR" v={`${ride.summary.avgHeartRateBpm ?? 0} bpm`} />
                <FStat k="Max HR" v={`${ride.summary.maxHeartRateBpm ?? 0} bpm`} />
                <FStat k="Avg power" v={`${ride.summary.avgPowerWatts ?? 0} W`} />
                <FStat k="Climbing" v={meters(ride.summary.totalAscentMeters)} />
              </div>
            </div>
            <div className="right">
              <div className="iflabel">Intensity · dominant zone</div>
              <div
                className="ifactor"
                style={{ color: ZONES[featZones.indexOf(Math.max(...featZones))]!.color }}
              >
                {ZONES[featZones.indexOf(Math.max(...featZones))]!.n}{" "}
                {ZONES[featZones.indexOf(Math.max(...featZones))]!.name}
              </div>
              <div className="mini-zone" aria-label="Time in zone for feature ride">
                {ZONES.map((z, i) => {
                  const tot = featZones.reduce((s, v) => s + v, 0) || 1;
                  const w = (featZones[i]! / tot) * 100;
                  return w > 0.3 ? (
                    <div
                      key={z.n}
                      className="seg"
                      style={{ width: `${w}%`, background: z.color }}
                      title={`${z.n}: ${duration(featZones[i])}`}
                    />
                  ) : null;
                })}
              </div>
              <div className="bar-axis" style={{ marginTop: 10 }}>
                {ZONES.map((z) => (
                  <span key={z.n} style={{ color: z.color }}>
                    {z.n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MONTHLY */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">Monthly volume</div>
            <div className="sec-sub">bar height = km · colour = the month's dominant zone</div>
          </div>
          <div className="months">
            {months.map((m) => {
              // dominant zone per month
              const mz = Array.from({ length: 7 }).map(() => 0);
              for (const r of rides) {
                const d = new Date(r.summary.startTime ?? "");
                if (Number.isFinite(d.getTime()) && d.getMonth() === m.month) {
                  const z = rideZones(r.id);
                  for (let i = 0; i < 7; i++) mz[i]! += z[i]!;
                }
              }
              const dom = mz.indexOf(Math.max(...mz));
              const h = Math.max(5, (m.distanceMeters / maxMonth) * 100);
              return (
                <div className="mcol" key={m.month}>
                  <div className="mh">
                    <span className="ml">{m.label}</span>
                    <span className="mv">{km(m.distanceMeters)} km</span>
                  </div>
                  <div className="mtrack">
                    <div
                      className="mbar"
                      style={{ height: `${h}%`, background: ZONES[dom]!.color }}
                    />
                  </div>
                  <div className="mfoot">
                    {m.rideCount} rides · {ZONES[dom]!.n}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIDE LIST */}
        <section className="section">
          <div className="sec-head">
            <div className="sec-title">All rides · zone profile each</div>
            <div className="sec-sub">{rides.length} entries · hover for zone time</div>
          </div>
          <div className="rlist">
            {rows.map((r) => (
              <Link
                key={r.ride.id}
                to="/rides/$activityId"
                params={{ activityId: r.ride.id }}
                className="rrow"
              >
                <span className="idx">{String(r.idx).padStart(2, "0")}</span>
                <div className="who">
                  <div className="t">{r.ride.filename.replace(/\.fit$/, "")}</div>
                  <div className="d">{dateLong(r.ride.summary.startTime)}</div>
                </div>
                <div className="mz" aria-hidden="true">
                  {ZONES.map((z, i) => {
                    const w = (r.zones[i]! / r.tot) * 100;
                    return w > 0.5 ? (
                      <div
                        key={z.n}
                        className="s"
                        style={{ width: `${w}%`, background: z.color }}
                        title={`${z.n} ${duration(r.zones[i])}`}
                      />
                    ) : null;
                  })}
                </div>
                <div className="dist">{km(r.ride.summary.totalDistanceMeters)} km</div>
                <div className="ifc" style={{ color: ZONES[r.dom]!.color }}>
                  {ZONES[r.dom]!.n}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer>
          <span>Zone · ride-lens · {SEASON.year}</span>
          <span>HRmax {HR_MAX} bpm · 7-zone model</span>
          <span>end of report</span>
        </footer>
      </div>
    </div>
  );
}

function ZoneDial({ zones, zoneTotal }: { zones: number[]; zoneTotal: number }) {
  const size = 440;
  const r = 168;
  const stroke = 38;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Season time-in-zone dial">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eceef0" strokeWidth={stroke} />
      {ZONES.map((z, i) => {
        const frac = zones[i]! / zoneTotal;
        if (frac <= 0.001) return null;
        const len = frac * circ;
        const seg = (
          <circle
            key={z.n}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={z.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          >
            <title>{`${z.n} ${z.name}: ${duration(zones[i])} (${(frac * 100).toFixed(1)}%)`}</title>
          </circle>
        );
        offset += len;
        return seg;
      })}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 6} fill="none" stroke="#e4e7e9" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r + stroke / 2 + 6} fill="none" stroke="#e4e7e9" strokeWidth="1" />
    </svg>
  );
}

function FStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="fstat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
