import { cn } from "@ride-lens/ui/lib/utils";
import { GaugeIcon, HeartPulseIcon, MountainIcon } from "lucide-react";

import type { RouteMetric } from "../../types";
import { metricLabel } from "../route/metrics";

export function MapMetricButton({
  metric,
  activeMetric,
  available,
  onSelect,
}: {
  readonly metric: RouteMetric;
  readonly activeMetric: RouteMetric;
  readonly available: boolean;
  readonly onSelect: (metric: RouteMetric) => void;
}) {
  const Icon =
    metric === "speed" ? GaugeIcon : metric === "heartRate" ? HeartPulseIcon : MountainIcon;
  const active = metric === activeMetric;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 border border-ride-ink/25 bg-ride-abyss/85 px-[9px] font-ride text-[11px] font-bold uppercase text-ride-ink-muted backdrop-blur-lg transition-colors hover:border-ride-amber hover:text-ride-ink disabled:cursor-default disabled:border-ride-ink/15 disabled:text-ride-ink-dim disabled:opacity-[0.38] disabled:hover:border-ride-ink/15 disabled:hover:text-ride-ink-dim max-[900px]:h-[30px] max-[900px]:px-2 [&_svg]:size-[13px]",
        active && "border-ride-amber bg-ride-amber text-ride-night hover:text-ride-night",
      )}
      disabled={!available}
      onClick={() => onSelect(metric)}
      aria-pressed={active}
    >
      <Icon />
      {metricLabel(metric)}
    </button>
  );
}
