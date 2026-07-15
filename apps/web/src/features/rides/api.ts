import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
  ActivitySegmentsResponse,
  FitImportResponse,
  HeartRateZoneProfileResponse,
  HeartRateZoneSeasonResponse,
  SaveHeartRateZoneProfilePayload,
  SegmentDetailResponse,
  SegmentListResponse,
} from "@ride-lens/api";
import { env } from "@ride-lens/env/web";
import {
  decodeActivityDetailResponse,
  decodeActivityListResponse,
  decodeActivityRoutesResponse,
  decodeActivitySegmentsResponse,
  decodeFitImportResponse,
  decodeHeartRateZoneProfileResponse,
  decodeHeartRateZoneSeasonResponse,
  decodeSegmentDetailResponse,
  decodeSegmentListResponse,
} from "@ride-lens/api";

type Decode<A> = (payload: unknown) => Promise<A>;

const apiUrl = (path: string) => new URL(path, env.VITE_SERVER_URL).toString();

export function listActivities(): Promise<ActivityListResponse> {
  return requestJson("/api/activities", decodeActivityListResponse);
}

export function listActivityRoutes(): Promise<ActivityRoutesResponse> {
  return requestJson("/api/activities/routes", decodeActivityRoutesResponse);
}

export function getActivity(activityId: string): Promise<ActivityDetailResponse> {
  return requestJson(`/api/activities/${activityId}`, decodeActivityDetailResponse);
}

export function listActivitySegments(activityId: string): Promise<ActivitySegmentsResponse> {
  return requestJson(`/api/activities/${activityId}/segments`, decodeActivitySegmentsResponse);
}

export function listSegments(): Promise<SegmentListResponse> {
  return requestJson("/api/segments", decodeSegmentListResponse);
}

export function getHeartRateZoneProfile(): Promise<HeartRateZoneProfileResponse> {
  return requestJson("/api/heart-rate-zones/profile", decodeHeartRateZoneProfileResponse);
}

export function saveHeartRateZoneProfile(
  payload: SaveHeartRateZoneProfilePayload,
): Promise<HeartRateZoneProfileResponse> {
  return requestJson("/api/heart-rate-zones/profile", decodeHeartRateZoneProfileResponse, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getHeartRateZoneSeason(year: number): Promise<HeartRateZoneSeasonResponse> {
  return requestJson(`/api/heart-rate-zones/season/${year}`, decodeHeartRateZoneSeasonResponse);
}

export function createSegment(payload: {
  readonly activityId: string;
  readonly name: string;
  readonly startRecordIndex: number;
  readonly endRecordIndex: number;
}): Promise<SegmentDetailResponse> {
  return requestJson("/api/segments", decodeSegmentDetailResponse, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateSegment(
  segmentId: string,
  payload: {
    readonly name: string;
    readonly startRecordIndex: number;
    readonly endRecordIndex: number;
  },
): Promise<SegmentDetailResponse> {
  return requestJson(`/api/segments/${segmentId}`, decodeSegmentDetailResponse, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function importFitFile(file: File): Promise<FitImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl("/api/activities/import"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return decodeFitImportResponse(payload);
}

async function requestJson<A>(url: string, decode: Decode<A>, init?: RequestInit): Promise<A> {
  const response = await fetch(apiUrl(url), { ...init, credentials: "include" });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return decode(payload);
}
