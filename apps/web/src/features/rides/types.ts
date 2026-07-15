import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
  ActivitySegmentsResponse,
  SegmentListResponse,
  HeartRateZoneProfileResponse,
  HeartRateZoneSeasonResponse,
} from "@ride-lens/api";

export type ActivityListItem = ActivityListResponse["activities"][number];
export type ActivityRoute = ActivityRoutesResponse["routes"][number];
export type ActivityRoutePoint = ActivityRoute["points"][number];
export type ActivityRecord = ActivityDetailResponse["records"][number];
export type ActivitySegment = ActivitySegmentsResponse["segments"][number];
export type SegmentWithEfforts = SegmentListResponse["segments"][number];
export type SegmentEffort = SegmentWithEfforts["efforts"][number];
export type HeartRateZoneProfile = NonNullable<HeartRateZoneProfileResponse["profile"]>;
export type HeartRateZoneSeason = HeartRateZoneSeasonResponse;

export interface LoadState<A> {
  data: A | null;
  error: string | null;
  loading: boolean;
}

export type RouteMetric = "speed" | "heartRate" | "elevation";
