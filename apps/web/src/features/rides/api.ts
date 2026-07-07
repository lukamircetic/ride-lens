import type {
  ActivityDetailResponse,
  ActivityListResponse,
  ActivityRoutesResponse,
  FitImportResponse,
} from "@ride-lens/api";
import {
  decodeActivityDetailResponse,
  decodeActivityListResponse,
  decodeActivityRoutesResponse,
  decodeFitImportResponse,
} from "@ride-lens/api";

type Decode<A> = (payload: unknown) => Promise<A>;

export function listActivities(): Promise<ActivityListResponse> {
  return requestJson("/api/activities", decodeActivityListResponse);
}

export function listActivityRoutes(): Promise<ActivityRoutesResponse> {
  return requestJson("/api/activities/routes", decodeActivityRoutesResponse);
}

export function getActivity(activityId: string): Promise<ActivityDetailResponse> {
  return requestJson(`/api/activities/${activityId}`, decodeActivityDetailResponse);
}

export async function importFitFile(file: File): Promise<FitImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/activities/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return decodeFitImportResponse(payload);
}

async function requestJson<A>(url: string, decode: Decode<A>, init?: RequestInit): Promise<A> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return decode(payload);
}
