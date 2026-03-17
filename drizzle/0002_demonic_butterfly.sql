ALTER TABLE `posts` ADD `linkedInUrl` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `publicationStatus` enum('queued','pending_confirm','confirmed') DEFAULT 'queued';