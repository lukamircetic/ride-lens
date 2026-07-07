import { GaugeIcon, HeartPulseIcon, MountainIcon } from "lucide-react";

import type { RouteMetric } from "../types";
import { metricLabel } from "./metrics";

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

  return (
    <button
      type="button"
      className={`map-tool${metric === activeMetric ? " active" : ""}`}
      disabled={!available}
      onClick={() => onSelect(metric)}
      aria-pressed={metric === activeMetric}
    >
      <Icon />
      {metricLabel(metric)}
    </button>
  );
}
