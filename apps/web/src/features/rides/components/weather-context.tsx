import type { ActivityDetailResponse } from "@ride-lens/api";
import { cn } from "@ride-lens/ui/lib/utils";
import { MoveUp } from "lucide-react";
import type { ReactNode } from "react";

import {
  formatDistance,
  formatMillimeters,
  formatPercentShare,
  formatTemperature,
  formatWindBurden,
  formatWindDirection,
  formatWindSpeed,
} from "../formatters";

type WeatherSummary = ActivityDetailResponse["weather"];

export function WeatherContext({ weather }: { readonly weather: WeatherSummary }) {
  if (weather === null) return null;

  const headwind = weather.averageHeadwindMetersPerSecond;
  const routeWindLabel = headwind === null || headwind >= 0 ? "Headwind" : "Tailwind";
  const routeWindValue = headwind === null ? null : Math.abs(headwind);
  const windBearing = weather.dominantWindDirectionDegrees ?? 0;
  const burdenTone = getBurdenTone(weather.windBurdenScore);
  const weatherContextClassName = cn(
    "mt-0 grid grid-cols-4 gap-px border border-ride-line bg-ride-line-soft max-[900px]:grid-cols-2",
    burdenTone === "harder" && "border-ride-amber/35",
    burdenTone === "helped" && "border-ride-tail/35",
  );

  return (
    <section className="mt-3.5" aria-label="Weather and wind context">
      <div className="mb-2.5 flex items-center justify-between gap-3 font-ride text-[11px] font-bold uppercase text-ride-ink-dim">
        <span className="inline-flex items-center text-ride-ink-muted">Weather</span>
      </div>
      <div className={weatherContextClassName}>
        <WeatherCell
          label="Wind from"
          value={
            <>
              {formatWindDirection(weather.dominantWindDirectionDegrees)}
              <MoveUp
                className="size-[18px] shrink-0 text-ride-amber drop-shadow-[0_0_5px_rgb(255_199_44_/_0.34)]"
                aria-hidden="true"
                strokeWidth={2}
                style={{ transform: `rotate(${windBearing}deg)` }}
              />
            </>
          }
        />
        <WeatherCell label={routeWindLabel} value={formatWindSpeed(routeWindValue)} />
        <WeatherCell label="Temp" value={formatTemperature(weather.averageTemperatureCelsius)} />
        <WeatherCell
          label="Wind"
          value={formatWindSpeed(weather.averageWindSpeedMetersPerSecond)}
        />
        <WeatherCell
          label="Air speed"
          value={formatWindSpeed(weather.averageAirSpeedMetersPerSecond)}
        />
        <WeatherCell
          label="Crosswind"
          value={formatWindSpeed(weather.averageCrosswindMetersPerSecond)}
        />
        <WeatherCell
          label="Rain"
          value={formatMillimeters(weather.totalPrecipitationMillimeters)}
        />
        <WeatherCell label="Gust" value={formatWindSpeed(weather.maxWindGustMetersPerSecond)} />
        <WeatherCell label="Max head" value={formatWindSpeed(weather.maxHeadwindMetersPerSecond)} />
        <WeatherCell label="Max tail" value={formatWindSpeed(weather.maxTailwindMetersPerSecond)} />
        <WeatherCell label="Burden" value={formatWindBurden(weather.windBurdenScore)} />
        <WeatherCell label="Long head" value={formatDistance(weather.longestHeadwindMeters)} />

        <div className="col-span-full grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-[22px] gap-y-2 bg-ride-abyss px-3.5 pt-[9px] pb-2.5 max-[900px]:grid-cols-1">
          <div className="font-ride text-[11px] font-semibold uppercase text-ride-ink-dim">
            Route split
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-6 gap-y-2 max-[900px]:justify-start max-[900px]:gap-x-[18px] max-[900px]:gap-y-[7px]">
            <WindSplitItem
              tone="head"
              label="Headwind"
              share={formatPercentShare(weather.headwindShare)}
              distance={formatDistance(weather.headwindDistanceMeters)}
            />
            <WindSplitItem
              tone="tail"
              label="Tailwind"
              share={formatPercentShare(weather.tailwindShare)}
              distance={formatDistance(weather.tailwindDistanceMeters)}
            />
            <WindSplitItem
              tone="cross"
              label="Crosswind"
              share={formatPercentShare(weather.crosswindShare)}
              distance={formatDistance(weather.crosswindDistanceMeters)}
            />
          </div>
          <div
            className="col-span-full flex h-1.5 overflow-hidden bg-ride-ink/8"
            aria-hidden="true"
          >
            <span
              className="block min-w-0 bg-ride-amber"
              style={shareStyle(weather.headwindShare)}
            />
            <span
              className="block min-w-0 bg-ride-tail"
              style={shareStyle(weather.tailwindShare)}
            />
            <span
              className="block min-w-0 bg-ride-cross"
              style={shareStyle(weather.crosswindShare)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function WindSplitItem({
  distance,
  label,
  share,
  tone,
}: {
  readonly distance: string;
  readonly label: string;
  readonly share: string;
  readonly tone: "head" | "tail" | "cross";
}) {
  const toneClassName =
    tone === "head" ? "bg-ride-amber" : tone === "tail" ? "bg-ride-tail" : "bg-ride-cross";

  return (
    <div className="inline-flex min-w-0 items-center gap-[7px] whitespace-nowrap leading-none">
      <span aria-hidden="true" className={cn("block size-[7px] -translate-y-px", toneClassName)} />
      <span className="font-ride text-[10px] leading-none font-semibold uppercase text-ride-ink-dim">
        {label}
      </span>
      <b className="font-ride-mono text-[11px] leading-none font-medium text-ride-ink-muted">
        {share}
      </b>
      <small className="font-ride-mono text-[11px] leading-none font-medium text-ride-ink-muted">
        <span className="mr-[7px] text-ride-ink-dim">/</span>
        {distance}
      </small>
    </div>
  );
}

function WeatherCell({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <div className="flex min-h-[39px] min-w-0 items-center justify-between gap-3 bg-ride-abyss px-3.5 py-[11px]">
      <span className="inline-flex items-center gap-2 font-ride text-[11px] font-semibold uppercase text-ride-ink-dim">
        {label}
      </span>
      <b className="inline-flex items-center gap-2 whitespace-nowrap font-ride-mono text-[13px] font-medium text-ride-ink">
        {value}
      </b>
    </div>
  );
}

const shareStyle = (value: number | null) => ({
  width: `${Math.max(0, Math.min(1, value ?? 0)) * 100}%`,
});

const getBurdenTone = (value: number | null): string => {
  if (value === null) return "neutral";
  if (value >= 10) return "harder";
  if (value <= -10) return "helped";
  return "neutral";
};
