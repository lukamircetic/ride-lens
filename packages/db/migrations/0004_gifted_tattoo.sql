DROP INDEX `fit_files_source_hash_idx`;--> statement-breakpoint
ALTER TABLE `fit_files` ADD `owner_user_id` text DEFAULT 'legacy-local-user' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `fit_files_owner_source_hash_idx` ON `fit_files` (`owner_user_id`,`source_hash`);--> statement-breakpoint
CREATE INDEX `fit_files_owner_idx` ON `fit_files` (`owner_user_id`);--> statement-breakpoint
ALTER TABLE `activities` ADD `owner_user_id` text DEFAULT 'legacy-local-user' NOT NULL;--> statement-breakpoint
CREATE INDEX `activities_owner_start_time_idx` ON `activities` (`owner_user_id`,`start_time`);