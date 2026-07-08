export const REPLAY_SPEED_MULTIPLIERS = [32, 64, 128] as const;

export type ReplayCameraMode = "static" | "follow";

export type ReplaySpeedMultiplier = (typeof REPLAY_SPEED_MULTIPLIERS)[number];

export interface ReplaySample {
  readonly recordIndex: number;
  readonly elapsedSeconds: number;
  readonly longitude: number;
  readonly latitude: number;
  readonly distanceMeters: number | null;
  readonly speedMetersPerSecond: number | null;
  readonly heartRateBpm: number | null;
  readonly altitudeMeters: number | null;
}

export interface MetricChartPoint {
  readonly time: number;
  readonly value: number;
}

export interface ReplayMetricChart {
  readonly data: ReadonlyArray<MetricChartPoint>;
  readonly value: number | null;
}

export interface ReplayFrame {
  readonly elapsedSeconds: number;
  readonly durationSeconds: number;
  readonly sampleIndex: number;
  readonly coordinate: readonly [number, number] | null;
  readonly headingDegrees: number | null;
  readonly trailCoordinates: ReadonlyArray<readonly [number, number]>;
  readonly distanceMeters: number | null;
  readonly speedMetersPerSecond: number | null;
  readonly heartRateBpm: number | null;
  readonly altitudeMeters: number | null;
}

export interface RideReplayController {
  readonly cameraMode: ReplayCameraMode;
  readonly chartWindowSeconds: number;
  readonly durationSeconds: number;
  readonly elapsedSeconds: number;
  readonly enabled: boolean;
  readonly elevationChart: ReplayMetricChart;
  readonly frame: ReplayFrame;
  readonly hasReplay: boolean;
  readonly heartRateChart: ReplayMetricChart;
  readonly playing: boolean;
  readonly progress: number;
  readonly speedChart: ReplayMetricChart;
  readonly speedMultiplier: ReplaySpeedMultiplier;
  readonly reset: () => void;
  readonly seek: (progress: number) => void;
  readonly setCameraMode: (cameraMode: ReplayCameraMode) => void;
  readonly setEnabled: (enabled: boolean) => void;
  readonly setSpeedMultiplier: (speedMultiplier: ReplaySpeedMultiplier) => void;
  readonly togglePlaying: () => void;
}
