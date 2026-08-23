CREATE INDEX `audit_merchant_idx` ON `audit_events` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `checkout_merchant_idx` ON `checkout_events` (`merchant_id`);--> statement-breakpoint
CREATE INDEX `product_merchant_idx` ON `products` (`merchant_id`);