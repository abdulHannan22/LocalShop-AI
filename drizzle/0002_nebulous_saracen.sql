CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`invited_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_merchant_email_idx` ON `memberships` (`merchant_id`,`email`);--> statement-breakpoint
CREATE INDEX `membership_user_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_slug_idx` ON `merchants` (`slug`);--> statement-breakpoint
CREATE TABLE `shopping_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`customer_email` text,
	`query` text NOT NULL,
	`intent_json` text NOT NULL,
	`engine` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shopping_session_merchant_idx` ON `shopping_sessions` (`merchant_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`platform_role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_idx` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `audit_events` ADD `merchant_id` text DEFAULT 'merchant_nova' NOT NULL;--> statement-breakpoint
ALTER TABLE `checkout_events` ADD `merchant_id` text DEFAULT 'merchant_nova' NOT NULL;--> statement-breakpoint
ALTER TABLE `checkout_events` ADD `customer_email` text;--> statement-breakpoint
ALTER TABLE `checkout_events` ADD `order_number` text;--> statement-breakpoint
ALTER TABLE `products` ADD `merchant_id` text DEFAULT 'merchant_nova' NOT NULL;