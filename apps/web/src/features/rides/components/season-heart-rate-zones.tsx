import type { HeartRateZoneSeasonResponse } from "@ride-lens/api";

import { formatDuration, formatPercentShare } from "../formatters";
import { BELOW_ZONE_COLOR, HEART_RATE_ZONE_COLORS } from "../heart-rate-zones";

export function SeasonHeartRateZones({ season }: { readonly season: HeartRateZoneSeasonResponse }) {
  const distribution = season.distribution;
  if (!season.profile || !distribution) return null;

  const easySeconds = zoneSeconds(distribution, [1, 2]);
  const tempoSeconds = zoneSeconds(distribution, [3]);
  const hardSeconds = zoneSeconds(distribution, [4, 5]);
  const classified = distribution.classifiedSeconds;
  const visibleWeeks = season.weeks.slice(-12);
  const maxWeekSeconds = Math.max(
    1,
    ...visibleWeeks.map((week) => week.zones.reduce((sum, zone) => sum + zone.seconds, 0)),
  );

  return (
    <div className="border border-ride-line bg-ride-abyss">
      <div className="grid grid-cols-[0.68fr_1.32fr] max-[900px]:grid-cols-1">
        <div className="border-r border-ride-line p-4 max-[900px]:border-r-0 max-[900px]:border-b">
          <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
            Season intensity balance
          </div>
          <div className="mt-4 space-y-4">
            <IntensityRow
              label="Below Z1"
              seconds={distribution.belowZoneSeconds}
              share={classified > 0 ? distribution.belowZoneSeconds / classified : 0}
              color={BELOW_ZONE_COLOR}
            />
            <IntensityRow
              label="Easy · Z1–Z2"
              seconds={easySeconds}
              share={classified > 0 ? easySeconds / classified : 0}
              color={HEART_RATE_ZONE_COLORS[2]}
            />
            <IntensityRow
              label="Tempo · Z3"
              seconds={tempoSeconds}
              share={classified > 0 ? tempoSeconds / classified : 0}
              color={HEART_RATE_ZONE_COLORS[3]}
            />
            <IntensityRow
              label="Hard · Z4–Z5"
              seconds={hardSeconds}
              share={classified > 0 ? hardSeconds / classified : 0}
              color={HEART_RATE_ZONE_COLORS[5]}
            />
          </div>
          <div className="mt-5 border-t border-ride-line-soft pt-3 font-ride-mono text-[10px] leading-5 text-ride-ink-dim">
            <div>
              {season.rideCount} rides in {season.year}
            </div>
            <div>
              {formatDuration(classified)} classified ·{" "}
              {formatPercentShare(distribution.coverageRatio)} coverage
            </div>
          </div>
        </div>

        <div className="min-w-0 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
              Weekly time by zone
            </div>
            <div className="font-ride-mono text-[9px] text-ride-ink-dim">
              Last {visibleWeeks.length} active {visibleWeeks.length === 1 ? "week" : "weeks"}
            </div>
          </div>
          {visibleWeeks.length === 0 ? (
            <div className="mt-5 border border-dashed border-ride-line p-8 text-center font-ride text-xs text-ride-ink-dim">
              Rides with classified heart-rate time will appear here.
            </div>
          ) : (
            <div className="mt-4 grid min-h-[190px] grid-cols-[repeat(auto-fit,minmax(42px,1fr))] items-end gap-2">
              {visibleWeeks.map((week) => {
                const total = week.zones.reduce((sum, zone) => sum + zone.seconds, 0);
                const height = Math.max(4, (total / maxWeekSeconds) * 154);

                return (
                  <div key={week.weekStart} className="flex min-w-0 flex-col items-stretch gap-2">
                    <div
                      className="flex flex-col-reverse overflow-hidden border border-ride-line-soft bg-ride-night-2"
                      style={{ height }}
                      title={`${week.weekStart}: ${formatDuration(total)}`}
                      role="img"
                      tabIndex={0}
                      aria-label={`${formatWeekLabel(week.weekStart)}, ${formatDuration(total)} total. ${week.zones.map((zone) => `Zone ${zone.number}: ${formatDuration(zone.seconds)}`).join(". ")}`}
                    >
                      {week.zones.map((zone) => (
                        <span
                          key={zone.number}
                          style={{
                            backgroundColor: HEART_RATE_ZONE_COLORS[zone.number],
                            height: total > 0 ? `${(zone.seconds / total) * 100}%` : 0,
                          }}
                        />
                      ))}
                    </div>
                    <span className="truncate text-center font-ride-mono text-[8px] text-ride-ink-dim">
                      {formatWeekLabel(week.weekStart)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-ride-line-soft pt-3">
            {distribution.zones.map((zone) => (
              <span
                key={zone.number}
                className="inline-flex items-center gap-1.5 font-ride text-[9px] font-bold uppercase text-ride-ink-dim"
              >
                <span
                  className="size-2"
                  style={{ backgroundColor: HEART_RATE_ZONE_COLORS[zone.number] }}
                  aria-hidden="true"
                />
                Z{zone.number}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntensityRow({
  label,
  seconds,
  share,
  color,
}: {
  readonly label: string;
  readonly seconds: number;
  readonly share: number;
  readonly color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-ride text-[10px] font-bold uppercase text-ride-ink-muted">
          {label}
        </span>
        <span className="font-ride-mono text-[11px] text-ride-ink">
          {formatDuration(seconds)} · {formatPercentShare(share)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 bg-ride-night-2">
        <div style={{ width: `${share * 100}%`, height: "100%", backgroundColor: color }} />
      </div>
    </div>
  );
}

function zoneSeconds(
  distribution: NonNullable<HeartRateZoneSeasonResponse["distribution"]>,
  zoneNumbers: ReadonlyArray<number>,
): number {
  return distribution.zones.reduce(
    (sum, zone) => sum + (zoneNumbers.includes(zone.number) ? zone.seconds : 0),
    0,
  );
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" })
    .format(date)
    .replace(" ", "\u00a0");
}
