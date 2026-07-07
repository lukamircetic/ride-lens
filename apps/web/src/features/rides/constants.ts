import type { ActivityListResponse, ActivityRoutesResponse } from "@ride-lens/api";
import { env } from "@ride-lens/env/web";

export const EMPTY_LIST: ActivityListResponse = { activities: [] };
export const EMPTY_ROUTES: ActivityRoutesResponse = { routes: [] };

export const DEFAULT_MAPTILER_STYLE_ID = "streets-v2";
export const RIDE_LOG_PAGE_SIZE = 10;

export const MAPTILER_API_KEY = env.VITE_MAPTILER_API_KEY?.trim() ?? "";
export const MAPTILER_STYLE_ID = env.VITE_MAPTILER_STYLE_ID?.trim() || DEFAULT_MAPTILER_STYLE_ID;
export const MAPTILER_STYLE_URL = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/${encodeURIComponent(MAPTILER_STYLE_ID)}/style.json?key=${encodeURIComponent(MAPTILER_API_KEY)}`
  : "";

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
