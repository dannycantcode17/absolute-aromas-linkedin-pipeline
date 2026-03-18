CREATE TABLE `image_guidelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profile` enum('aa_company','david_personal','blog_post') NOT NULL,
	`content` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `image_guidelines_id` PRIMARY KEY(`id`),
	CONSTRAINT `image_guidelines_profile_unique` UNIQUE(`profile`)
);
--> statement-breakpoint
ALTER TABLE `ideas` ADD `savedAt` timestamp;