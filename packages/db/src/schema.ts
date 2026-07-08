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

export const weather_observations = sqliteTable(
  "weather_observations",
  {
    activity_id: text()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    timestamp: integer().notNull(),
    latitude: real().notNull(),
    longitude: real().notNull(),
    temperature_celsius: real(),
    precipitation_millimeters: real(),
    wind_speed_meters_per_second: real(),
    wind_direction_degrees: real(),
    wind_gust_meters_per_second: real(),
    provider: text().notNull(),
    model: text(),
    time_created: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.activity_id, table.timestamp] }),
    index("weather_observations_activity_time_idx").on(table.activity_id, table.timestamp),
  ],
);

export const segments = sqliteTable(
  "segments",
  {
    id: text().primaryKey(),
    source_activity_id: text()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    name: text().notNull(),
    source: text({ enum: ["manual"] })
      .notNull()
      .default("manual"),
    sport: text(),
    start_record_index: integer().notNull(),
    end_record_index: integer().notNull(),
    start_distance_meters: real(),
    end_distance_meters: real(),
    start_time: integer(),
    end_time: integer(),
    start_latitude: real(),
    start_longitude: real(),
    end_latitude: real(),
    end_longitude: real(),
    distance_meters: real(),
    elapsed_seconds: real(),
    moving_seconds: real(),
    average_speed_meters_per_second: real(),
    max_speed_meters_per_second: real(),
    average_heart_rate_bpm: real(),
    max_heart_rate_bpm: integer(),
    elevation_gain_meters: real(),
    elevation_loss_meters: real(),
    vam_meters_per_hour: real(),
    average_cadence_rpm: real(),
    average_power_watts: real(),
    normalized_power_watts: real(),
    geometry_json: text().notNull(),
    created_at: integer().notNull(),
    updated_at: integer().notNull(),
  },
  (table) => [
    index("segments_source_activity_idx").on(table.source_activity_id),
    index("segments_sport_idx").on(table.sport),
  ],
);

export const segment_efforts = sqliteTable(
  "segment_efforts",
  {
    id: text().primaryKey(),
    segment_id: text()
      .notNull()
      .references(() => segments.id, { onDelete: "cascade" }),
    activity_id: text()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    attempt_index: integer().notNull(),
    source: text({ enum: ["source", "matched"] }).notNull(),
    start_record_index: integer().notNull(),
    end_record_index: integer().notNull(),
    start_distance_meters: real(),
    end_distance_meters: real(),
    start_time: integer(),
    end_time: integer(),
    distance_meters: real(),
    elapsed_seconds: real(),
    moving_seconds: real(),
    average_speed_meters_per_second: real(),
    max_speed_meters_per_second: real(),
    average_heart_rate_bpm: real(),
    max_heart_rate_bpm: integer(),
    elevation_gain_meters: real(),
    elevation_loss_meters: real(),
    vam_meters_per_hour: real(),
    average_cadence_rpm: real(),
    average_power_watts: real(),
    normalized_power_watts: real(),
    coverage_ratio: real().notNull(),
    confidence: real().notNull(),
    average_deviation_meters: real(),
    max_deviation_meters: real(),
    computed_at: integer().notNull(),
  },
  (table) => [
    uniqueIndex("segment_efforts_segment_activity_attempt_idx").on(
      table.segment_id,
      table.activity_id,
      table.attempt_index,
    ),
    index("segment_efforts_activity_idx").on(table.activity_id),
    index("segment_efforts_segment_elapsed_idx").on(table.segment_id, table.elapsed_seconds),
  ],
);

export const activity_weather_summaries = sqliteTable("activity_weather_summaries", {
  activity_id: text()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  provider: text().notNull(),
  model: text(),
  latitude: real().notNull(),
  longitude: real().notNull(),
  start_time: integer().notNull(),
  end_time: integer().notNull(),
  observation_count: integer().notNull(),
  sample_count: integer().notNull(),
  average_temperature_celsius: real(),
  total_precipitation_millimeters: real(),
  average_wind_speed_meters_per_second: real(),
  max_wind_gust_meters_per_second: real(),
  dominant_wind_direction_degrees: real(),
  average_air_speed_meters_per_second: real(),
  average_headwind_meters_per_second: real(),
  max_headwind_meters_per_second: real(),
  max_tailwind_meters_per_second: real(),
  average_crosswind_meters_per_second: real(),
  headwind_distance_meters: real(),
  tailwind_distance_meters: real(),
  crosswind_distance_meters: real(),
  headwind_seconds: real(),
  tailwind_seconds: real(),
  crosswind_seconds: real(),
  longest_headwind_meters: real(),
  headwind_share: real(),
  tailwind_share: real(),
  crosswind_share: real(),
  wind_burden_score: real(),
  computed_at: integer().notNull(),
});

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
  source_segments: many(segments),
  segment_efforts: many(segment_efforts),
  weather_observations: many(weather_observations),
  weather_summary: one(activity_weather_summaries, {
    fields: [activities.id],
    references: [activity_weather_summaries.activity_id],
  }),
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

export const segments_relations = relations(segments, ({ one, many }) => ({
  source_activity: one(activities, {
    fields: [segments.source_activity_id],
    references: [activities.id],
  }),
  efforts: many(segment_efforts),
}));

export const segment_efforts_relations = relations(segment_efforts, ({ one }) => ({
  segment: one(segments, {
    fields: [segment_efforts.segment_id],
    references: [segments.id],
  }),
  activity: one(activities, {
    fields: [segment_efforts.activity_id],
    references: [activities.id],
  }),
}));

export const weather_observations_relations = relations(weather_observations, ({ one }) => ({
  activity: one(activities, {
    fields: [weather_observations.activity_id],
    references: [activities.id],
  }),
}));

export const activity_weather_summaries_relations = relations(
  activity_weather_summaries,
  ({ one }) => ({
    activity: one(activities, {
      fields: [activity_weather_summaries.activity_id],
      references: [activities.id],
    }),
  }),
);

export type ActivityRow = typeof activities.$inferSelect;
export type FitFileRow = typeof fit_files.$inferSelect;
export type SegmentRow = typeof segments.$inferSelect;
export type SegmentEffortRow = typeof segment_efforts.$inferSelect;
export type WeatherObservationRow = typeof weather_observations.$inferSelect;
export type ActivityWeatherSummaryRow = typeof activity_weather_summaries.$inferSelect;
