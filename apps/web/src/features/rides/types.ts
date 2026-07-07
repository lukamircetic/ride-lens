import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
} from "@ride-lens/api";

export type ActivityListItem = ActivityListResponse["activities"][number];
export type ActivityRoute = ActivityRoutesResponse["routes"][number];
export type ActivityRoutePoint = ActivityRoute["points"][number];
export type ActivityRecord = ActivityDetailResponse["records"][number];

export interface LoadState<A> {
  data: A | null;
  error: string | null;
  loading: boolean;
}

export type RouteMetric = "speed" | "heartRate" | "elevation";
