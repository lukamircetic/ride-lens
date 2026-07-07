import type { ActivityListItem } from "./types";

export function formatRideTitle(activity: ActivityListItem): string {
  const date = parseIsoDate(activity.summary.startTime);
  if (date === null) return activity.filename.replace(/\.fit$/i, "");
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(value: string | null): string {
  const date = parseIsoDate(value);
  if (date === null) return "n/a";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function formatDate(value: string | null): string {
  const date = parseIsoDate(value);
  if (date === null) return "n/a";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function formatDateTime(value: string | null): string {
  const date = parseIsoDate(value);
  if (date === null) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

export function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} km`;
}

export function formatDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${(value * 3.6).toFixed(1)} km/h`;
}

export function formatDeltaDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatDistance(value)}`;
}

export function formatDeltaSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatSpeed(value)}`;
}

export function formatElevation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value).toLocaleString()}`;
}

export function formatBpm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} bpm`;
}

export function formatWatts(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} W`;
}

export function formatCadence(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} rpm`;
}

export function formatTemperature(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value)} C`;
}

export function formatWindSpeed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${value.toFixed(1)} m/s`;
}

export function formatMillimeters(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${value.toFixed(value >= 10 ? 0 : 1)} mm`;
}

export function formatPercentShare(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

export function formatWindDirection(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round((((value % 360) + 360) % 360) / 45) % directions.length]!;
}

export function formatWindBurden(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

export function parseIsoDate(value: string | null): Date | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatUploadProgress(
  progress: { readonly current: number; readonly total: number } | null,
): string {
  return progress ? `Importing ${progress.current}/${progress.total}` : "Importing";
}

export function formatImportFailures(failures: ReadonlyArray<string>, total: number): string {
  const shown = failures.slice(0, 2).join(" ");
  const hiddenCount = failures.length - 2;
  const hidden = hiddenCount > 0 ? ` ${hiddenCount} more failed.` : "";
  return `${failures.length} of ${total} FIT files could not be imported. ${shown}${hidden}`;
}

export function errorToMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}
