import { useEffect, useMemo, useRef, useState } from "react";

import type { ActivityRecord } from "../../types";
import { ReplayMapControls } from "./replay-controls";
import { useReplayMapEffects } from "./replay-map-effects";
import { buildMetricChart, buildReplayFrame, buildReplaySamples } from "./replay-metrics";
import type { ReplayCameraMode, ReplaySpeedMultiplier, RideReplayController } from "./replay-types";

export function useRideReplay({
  records,
}: {
  readonly records: ReadonlyArray<ActivityRecord>;
}): RideReplayController {
  const samples = useMemo(() => buildReplaySamples(records), [records]);
  const durationSeconds = samples.at(-1)?.elapsedSeconds ?? 0;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [enabled, setEnabledState] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<ReplaySpeedMultiplier>(64);
  const [cameraMode, setCameraMode] = useState<ReplayCameraMode>("static");
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const frame = useMemo(
    () => buildReplayFrame(samples, clamp(elapsedSeconds, 0, durationSeconds)),
    [elapsedSeconds, durationSeconds, samples],
  );

  useEffect(() => {
    setElapsedSeconds(0);
    setEnabledState(false);
    setPlaying(false);
  }, [records]);

  useEffect(() => {
    if (elapsedSeconds <= durationSeconds) return;
    setElapsedSeconds(durationSeconds);
  }, [durationSeconds, elapsedSeconds]);

  useEffect(() => {
    if (!playing || durationSeconds <= 0) return;

    const tick = (now: number) => {
      const previousTick = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const deltaSeconds = ((now - previousTick) / 1000) * speedMultiplier;

      setElapsedSeconds((current) => {
        const next = current + deltaSeconds;
        if (next >= durationSeconds) {
          setPlaying(false);
          return durationSeconds;
        }
        return next;
      });

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastTickRef.current = null;
    };
  }, [durationSeconds, playing, speedMultiplier]);

  const chartWindowSeconds = Math.max(30, durationSeconds || 30);
  const speedChart = useMemo(
    () =>
      buildMetricChart(samples, frame, (sample) =>
        sample.speedMetersPerSecond === null ? null : sample.speedMetersPerSecond * 3.6,
      ),
    [frame, samples],
  );
  const elevationChart = useMemo(
    () => buildMetricChart(samples, frame, (sample) => sample.altitudeMeters),
    [frame, samples],
  );
  const heartRateChart = useMemo(
    () => buildMetricChart(samples, frame, (sample) => sample.heartRateBpm),
    [frame, samples],
  );

  return {
    cameraMode,
    chartWindowSeconds,
    durationSeconds,
    elapsedSeconds: frame.elapsedSeconds,
    enabled,
    elevationChart,
    frame,
    hasReplay: samples.length >= 2,
    heartRateChart,
    playing,
    progress: durationSeconds > 0 ? frame.elapsedSeconds / durationSeconds : 0,
    speedChart,
    speedMultiplier,
    reset: () => {
      setPlaying(false);
      setElapsedSeconds(0);
    },
    seek: (progress: number) => {
      setElapsedSeconds(clamp(progress, 0, 1) * durationSeconds);
    },
    setCameraMode,
    setEnabled: (nextEnabled: boolean) => {
      setEnabledState(nextEnabled);
      if (!nextEnabled) setPlaying(false);
    },
    setSpeedMultiplier,
    togglePlaying: () => {
      if (durationSeconds <= 0) return;
      setPlaying((current) => {
        if (current) return false;
        if (elapsedSeconds >= durationSeconds) setElapsedSeconds(0);
        return true;
      });
    },
  };
}

export { ReplayMapControls, useReplayMapEffects };
export type { RideReplayController as RideReplay, ReplayFrame } from "./replay-types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
