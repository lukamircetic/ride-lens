ALTER TABLE `activity_weather_summaries` ADD `average_air_speed_meters_per_second` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `max_headwind_meters_per_second` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `max_tailwind_meters_per_second` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `headwind_distance_meters` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `tailwind_distance_meters` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `crosswind_distance_meters` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `headwind_seconds` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `tailwind_seconds` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `crosswind_seconds` real;--> statement-breakpoint
ALTER TABLE `activity_weather_summaries` ADD `longest_headwind_meters` real;