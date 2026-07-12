PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
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
INSERT INTO `__new_activities`("id", "owner_user_id", "fit_file_id", "start_time", "end_time", "sport", "sub_sport", "total_distance_meters", "total_elapsed_seconds", "total_timer_seconds", "total_moving_seconds", "total_ascent_meters", "total_descent_meters", "calories", "avg_speed_meters_per_second", "max_speed_meters_per_second", "avg_heart_rate_bpm", "max_heart_rate_bpm", "avg_power_watts", "max_power_watts", "normalized_power_watts", "avg_cadence_rpm", "start_latitude", "start_longitude", "record_count", "lap_count", "session_count", "has_gps", "time_created") SELECT "id", "owner_user_id", "fit_file_id", "start_time", "end_time", "sport", "sub_sport", "total_distance_meters", "total_elapsed_seconds", "total_timer_seconds", "total_moving_seconds", "total_ascent_meters", "total_descent_meters", "calories", "avg_speed_meters_per_second", "max_speed_meters_per_second", "avg_heart_rate_bpm", "max_heart_rate_bpm", "avg_power_watts", "max_power_watts", "normalized_power_watts", "avg_cadence_rpm", "start_latitude", "start_longitude", "record_count", "lap_count", "session_count", "has_gps", "time_created" FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `activities_fit_file_id_idx` ON `activities` (`fit_file_id`);--> statement-breakpoint
CREATE INDEX `activities_owner_start_time_idx` ON `activities` (`owner_user_id`,`start_time`);--> statement-breakpoint
CREATE INDEX `activities_start_time_idx` ON `activities` (`start_time`);--> statement-breakpoint
CREATE INDEX `activities_sport_start_time_idx` ON `activities` (`sport`,`start_time`);--> statement-breakpoint
CREATE TABLE `__new_fit_files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`source_hash` text NOT NULL,
	`original_filename` text NOT NULL,
	`relative_path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`time_created` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_fit_files`("id", "owner_user_id", "source_hash", "original_filename", "relative_path", "size_bytes", "time_created") SELECT "id", "owner_user_id", "source_hash", "original_filename", "relative_path", "size_bytes", "time_created" FROM `fit_files`;--> statement-breakpoint
DROP TABLE `fit_files`;--> statement-breakpoint
ALTER TABLE `__new_fit_files` RENAME TO `fit_files`;--> statement-breakpoint
CREATE UNIQUE INDEX `fit_files_owner_source_hash_idx` ON `fit_files` (`owner_user_id`,`source_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `fit_files_relative_path_idx` ON `fit_files` (`relative_path`);--> statement-breakpoint
CREATE INDEX `fit_files_owner_idx` ON `fit_files` (`owner_user_id`);