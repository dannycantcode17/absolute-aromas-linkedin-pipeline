CREATE TABLE `guardrail_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitorNames` text NOT NULL DEFAULT (''),
	`bannedPhrases` text NOT NULL DEFAULT (''),
	`flaggedClaimTypes` text NOT NULL DEFAULT ('medical,financial,superlative'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardrail_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posting_rhythm` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profile` enum('aa_company','david_personal','blog_post') NOT NULL,
	`targetPerWeek` int NOT NULL DEFAULT 2,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posting_rhythm_id` PRIMARY KEY(`id`),
	CONSTRAINT `posting_rhythm_profile_unique` UNIQUE(`profile`)
);
--> statement-breakpoint
CREATE TABLE `style_guides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profile` enum('aa_company','david_personal','blog_post') NOT NULL,
	`content` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `style_guides_id` PRIMARY KEY(`id`),
	CONSTRAINT `style_guides_profile_unique` UNIQUE(`profile`)
);
--> statement-breakpoint
ALTER TABLE `ideas` MODIFY COLUMN `suggestedProfile` enum('aa_company','david_personal','blog_post');--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `profile` enum('aa_company','david_personal','blog_post') NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `blogKeyword` varchar(255);--> statement-breakpoint
ALTER TABLE `jobs` ADD `blogTone` enum('educational','thought_leadership','story_driven');--> statement-breakpoint
ALTER TABLE `jobs` ADD `blogWordCount` enum('short','standard','long');