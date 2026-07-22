import { Button } from "@ride-lens/ui/components/button";
import { cn } from "@ride-lens/ui/lib/utils";

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
  const active = metric === activeMetric;

  return (
    <Button
      type="button"
      variant="unstyled"
      className={cn(
        "box-border inline-flex h-7 w-[116px] cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-ride-ink/25 bg-ride-abyss/85 px-[9px] py-0 font-ride text-[10px] leading-none font-bold uppercase text-ride-ink backdrop-blur-lg transition-colors hover:border-ride-amber-deep hover:bg-ride-amber/15 disabled:cursor-default disabled:border-ride-ink/15 disabled:text-ride-ink-dim disabled:opacity-[0.38] disabled:hover:border-ride-ink/15 disabled:hover:text-ride-ink-dim max-[900px]:px-2 max-[720px]:w-full max-[720px]:px-1.5",
        active && "border-ride-amber bg-ride-abyss/85 text-ride-ink hover:border-ride-amber-bright",
      )}
      disabled={!available}
      onClick={() => onSelect(metric)}
      aria-pressed={active}
    >
      {metricLabel(metric)}
    </Button>
  );
}
