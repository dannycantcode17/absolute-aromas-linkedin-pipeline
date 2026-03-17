CREATE TABLE `approval_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`jobId` int NOT NULL,
	`approverRole` enum('danny','david') NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `approval_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `approver_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approverRole` enum('danny','david') NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approver_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `approver_config_approverRole_unique` UNIQUE(`approverRole`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int,
	`postId` int,
	`actor` varchar(128) NOT NULL,
	`action` varchar(64) NOT NULL,
	`details` json,
	`notionSynced` boolean NOT NULL DEFAULT false,
	`notionPageId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guardrail_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`flagType` varchar(64) NOT NULL,
	`severity` enum('block','warn') NOT NULL,
	`excerpt` text NOT NULL,
	`description` text NOT NULL,
	`resolution` enum('pending','resolved','auto_cleared') NOT NULL DEFAULT 'pending',
	`resolvedBy` varchar(64),
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardrail_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submittedById` int NOT NULL,
	`profile` enum('aa_company','david_personal') NOT NULL,
	`contentPillar` varchar(128) NOT NULL,
	`topic` text NOT NULL,
	`referenceUrl` text,
	`namedClientFlag` boolean NOT NULL DEFAULT false,
	`namedClientConfirmed` boolean NOT NULL DEFAULT false,
	`targetAudience` text,
	`toneHint` text,
	`status` enum('pending_confirmation','pending_style_guide','generating','pending_guardrail','pending_approval','approved','rejected','published') NOT NULL DEFAULT 'pending_style_guide',
	`requiredApprover` enum('danny','david') NOT NULL,
	`styleGuideSnapshot` text,
	`generationAttempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`variantLabel` varchar(4) NOT NULL,
	`content` text NOT NULL,
	`iteration` int NOT NULL DEFAULT 1,
	`status` enum('draft','flagged','pending_approval','approved','rejected','superseded') NOT NULL DEFAULT 'draft',
	`guardrailFlags` json,
	`approvedBy` varchar(64),
	`approvedAt` timestamp,
	`rejectionReason` text,
	`editFeedback` text,
	`suggestedPublishDate` timestamp,
	`publishedAt` timestamp,
	`publishedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
