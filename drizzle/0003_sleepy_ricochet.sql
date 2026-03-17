CREATE TABLE `idea_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submittedById` int NOT NULL,
	`promptTopic` text NOT NULL,
	`contentPillar` varchar(128),
	`profile` enum('aa_company','david_personal','both') DEFAULT 'both',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `idea_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`suggestedPillar` varchar(128),
	`suggestedProfile` enum('aa_company','david_personal'),
	`rationale` text,
	`status` enum('pending','queued','rejected') NOT NULL DEFAULT 'pending',
	`jobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ideas_id` PRIMARY KEY(`id`)
);
