import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const fit_files = sqliteTable(
  "fit_files",
  {
    id: text().primaryKey(),
    source_hash: text().notNull(),
    original_filename: text().notNull(),
    relative_path: text().notNull(),
    size_bytes: integer().notNull(),
    time_created: integer().notNull(),
  },
  (table) => [
    uniqueIndex("fit_files_source_hash_idx").on(table.source_hash),
    uniqueIndex("fit_files_relative_path_idx").on(table.relative_path),
  ],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text().primaryKey(),
    fit_file_id: text()
      .notNull()
      .references(() => fit_files.id, { onDelete: "restrict" }),
    start_time: integer(),
    end_time: integer(),
    sport: text(),
    sub_sport: text(),
    total_distance_meters: real(),
    total_elapsed_seconds: real(),
    total_timer_seconds: real(),
    total_moving_seconds: real(),
    total_ascent_meters: real(),
    total_descent_meters: real(),
    calories: integer(),
    avg_speed_meters_per_second: real(),
    max_speed_meters_per_second: real(),
    avg_heart_rate_bpm: integer(),
    max_heart_rate_bpm: integer(),
    avg_power_watts: integer(),
    max_power_watts: integer(),
    normalized_power_watts: integer(),
    avg_cadence_rpm: integer(),
    start_latitude: real(),
    start_longitude: real(),
    record_count: integer().notNull().default(0),
    lap_count: integer().notNull().default(0),
    session_count: integer().notNull().default(0),
    has_gps: integer({ mode: "boolean" }).notNull().default(false),
    time_created: integer().notNull(),
  },
  (table) => [
    uniqueIndex("activities_fit_file_id_idx").on(table.fit_file_id),
    index("activities_start_time_idx").on(table.start_time),
    index("activities_sport_start_time_idx").on(table.sport, table.start_time),
  ],
);

export const activity_records = sqliteTable(
  "activity_records",
  {
    activity_id: text()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    record_index: integer().notNull(),
    timestamp: integer(),
    latitude: real(),
    longitude: real(),
    altitude_meters: real(),
    distance_meters: real(),
    speed_meters_per_second: real(),
    heart_rate_bpm: integer(),
    cadence_rpm: integer(),
    power_watts: integer(),
    temperature_celsius: integer(),
    grade_percent: real(),
    gps_accuracy_meters: integer(),
  },
  (table) => [
    primaryKey({ columns: [table.activity_id, table.record_index] }),
    index("activity_records_activity_timestamp_idx").on(table.activity_id, table.timestamp),
  ],
);

export const activity_laps = sqliteTable(
  "activity_laps",
  {
    activity_id: text()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    lap_index: integer().notNull(),
    start_time: integer(),
    end_time: integer(),
    total_distance_meters: real(),
    total_elapsed_seconds: real(),
    total_timer_seconds: real(),
    avg_speed_meters_per_second: real(),
    max_speed_meters_per_second: real(),
    avg_heart_rate_bpm: integer(),
    max_heart_rate_bpm: integer(),
    avg_power_watts: integer(),
    max_power_watts: integer(),
    avg_cadence_rpm: integer(),
    total_ascent_meters: real(),
    total_descent_meters: real(),
    start_latitude: real(),
    start_longitude: real(),
    end_latitude: real(),
    end_longitude: real(),
  },
  (table) => [
    primaryKey({ columns: [table.activity_id, table.lap_index] }),
    index("activity_laps_activity_start_time_idx").on(table.activity_id, table.start_time),
  ],
);

export const fit_files_relations = relations(fit_files, ({ one }) => ({
  activity: one(activities, {
    fields: [fit_files.id],
    references: [activities.fit_file_id],
  }),
}));

export const activities_relations = relations(activities, ({ one, many }) => ({
  fit_file: one(fit_files, {
    fields: [activities.fit_file_id],
    references: [fit_files.id],
  }),
  records: many(activity_records),
  laps: many(activity_laps),
}));

export const activity_records_relations = relations(activity_records, ({ one }) => ({
  activity: one(activities, {
    fields: [activity_records.activity_id],
    references: [activities.id],
  }),
}));

export const activity_laps_relations = relations(activity_laps, ({ one }) => ({
  activity: one(activities, {
    fields: [activity_laps.activity_id],
    references: [activities.id],
  }),
}));

export type ActivityRow = typeof activities.$inferSelect;
export type FitFileRow = typeof fit_files.$inferSelect;
