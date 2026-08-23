CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`detail` text NOT NULL,
	`engine` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_event_id_idx` ON `audit_events` (`event_id`);--> statement-breakpoint
CREATE TABLE `checkout_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checkout_id` text NOT NULL,
	`session_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_reference` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_events_checkout_id_unique` ON `checkout_events` (`checkout_id`);