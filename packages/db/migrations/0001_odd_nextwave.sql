CREATE TABLE `activity_weather_summaries` (
	`activity_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`observation_count` integer NOT NULL,
	`sample_count` integer NOT NULL,
	`average_temperature_celsius` real,
	`total_precipitation_millimeters` real,
	`average_wind_speed_meters_per_second` real,
	`max_wind_gust_meters_per_second` real,
	`dominant_wind_direction_degrees` real,
	`average_headwind_meters_per_second` real,
	`average_crosswind_meters_per_second` real,
	`headwind_share` real,
	`tailwind_share` real,
	`crosswind_share` real,
	`wind_burden_score` real,
	`computed_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `weather_observations` (
	`activity_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`temperature_celsius` real,
	`precipitation_millimeters` real,
	`wind_speed_meters_per_second` real,
	`wind_direction_degrees` real,
	`wind_gust_meters_per_second` real,
	`provider` text NOT NULL,
	`model` text,
	`time_created` integer NOT NULL,
	PRIMARY KEY(`activity_id`, `timestamp`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weather_observations_activity_time_idx` ON `weather_observations` (`activity_id`,`timestamp`);