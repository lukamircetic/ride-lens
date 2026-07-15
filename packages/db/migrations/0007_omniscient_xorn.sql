CREATE TABLE `heart_rate_zone_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`sport` text DEFAULT 'cycling' NOT NULL,
	`method` text NOT NULL,
	`maximum_heart_rate_bpm` integer,
	`maximum_heart_rate_source` text,
	`resting_heart_rate_bpm` integer,
	`zone_1_lower_bpm` integer NOT NULL,
	`zone_2_lower_bpm` integer NOT NULL,
	`zone_3_lower_bpm` integer NOT NULL,
	`zone_4_lower_bpm` integer NOT NULL,
	`zone_5_lower_bpm` integer NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `heart_rate_zone_profiles_owner_sport_idx` ON `heart_rate_zone_profiles` (`owner_user_id`,`sport`);
