CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`fit_file_id` text NOT NULL,
	`start_time` integer,
	`end_time` integer,
	`sport` text,
	`sub_sport` text,
	`total_distance_meters` real,
	`total_elapsed_seconds` real,
	`total_timer_seconds` real,
	`total_moving_seconds` real,
	`total_ascent_meters` real,
	`total_descent_meters` real,
	`calories` integer,
	`avg_speed_meters_per_second` real,
	`max_speed_meters_per_second` real,
	`avg_heart_rate_bpm` integer,
	`max_heart_rate_bpm` integer,
	`avg_power_watts` integer,
	`max_power_watts` integer,
	`normalized_power_watts` integer,
	`avg_cadence_rpm` integer,
	`start_latitude` real,
	`start_longitude` real,
	`record_count` integer DEFAULT 0 NOT NULL,
	`lap_count` integer DEFAULT 0 NOT NULL,
	`session_count` integer DEFAULT 0 NOT NULL,
	`has_gps` integer DEFAULT false NOT NULL,
	`time_created` integer NOT NULL,
	FOREIGN KEY (`fit_file_id`) REFERENCES `fit_files`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_fit_file_id_idx` ON `activities` (`fit_file_id`);--> statement-breakpoint
CREATE INDEX `activities_start_time_idx` ON `activities` (`start_time`);--> statement-breakpoint
CREATE INDEX `activities_sport_start_time_idx` ON `activities` (`sport`,`start_time`);--> statement-breakpoint
CREATE TABLE `activity_laps` (
	`activity_id` text NOT NULL,
	`lap_index` integer NOT NULL,
	`start_time` integer,
	`end_time` integer,
	`total_distance_meters` real,
	`total_elapsed_seconds` real,
	`total_timer_seconds` real,
	`avg_speed_meters_per_second` real,
	`max_speed_meters_per_second` real,
	`avg_heart_rate_bpm` integer,
	`max_heart_rate_bpm` integer,
	`avg_power_watts` integer,
	`max_power_watts` integer,
	`avg_cadence_rpm` integer,
	`total_ascent_meters` real,
	`total_descent_meters` real,
	`start_latitude` real,
	`start_longitude` real,
	`end_latitude` real,
	`end_longitude` real,
	PRIMARY KEY(`activity_id`, `lap_index`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_laps_activity_start_time_idx` ON `activity_laps` (`activity_id`,`start_time`);--> statement-breakpoint
CREATE TABLE `activity_records` (
	`activity_id` text NOT NULL,
	`record_index` integer NOT NULL,
	`timestamp` integer,
	`latitude` real,
	`longitude` real,
	`altitude_meters` real,
	`distance_meters` real,
	`speed_meters_per_second` real,
	`heart_rate_bpm` integer,
	`cadence_rpm` integer,
	`power_watts` integer,
	`temperature_celsius` integer,
	`grade_percent` real,
	`gps_accuracy_meters` integer,
	PRIMARY KEY(`activity_id`, `record_index`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_records_activity_timestamp_idx` ON `activity_records` (`activity_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `fit_files` (
	`id` text PRIMARY KEY NOT NULL,
	`source_hash` text NOT NULL,
	`original_filename` text NOT NULL,
	`relative_path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`time_created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fit_files_source_hash_idx` ON `fit_files` (`source_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `fit_files_relative_path_idx` ON `fit_files` (`relative_path`);