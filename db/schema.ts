import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const merchants = sqliteTable(
  "merchants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("merchant_slug_idx").on(table.slug)],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    platformRole: text("platform_role").notNull().default("user"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("user_email_idx").on(table.email)],
);

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id").notNull(),
    userId: text("user_id"),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("invited"),
    invitedBy: text("invited_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("membership_merchant_email_idx").on(table.merchantId, table.email),
    index("membership_user_idx").on(table.userId),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    merchantId: text("merchant_id").notNull().default("merchant_nova"),
    name: text("name").notNull(),
    category: text("category").notNull(),
    price: integer("price").notNull(),
    rating: real("rating").notNull().default(4.5),
    inventory: integer("inventory").notNull().default(0),
    description: text("description").notNull(),
    tags: text("tags").notNull().default("[]"),
    accent: text("accent").notNull().default("lime"),
    imageUrl: text("image_url"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("product_merchant_idx").on(table.merchantId)],
);

export const shoppingSessions = sqliteTable(
  "shopping_sessions",
  {
    id: text("id").primaryKey(),
    merchantId: text("merchant_id").notNull(),
    customerEmail: text("customer_email"),
    query: text("query").notNull(),
    intentJson: text("intent_json").notNull(),
    engine: text("engine").notNull(),
    status: text("status").notNull().default("active"),
    matchQuality: text("match_quality"),
    topProductId: integer("top_product_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("shopping_session_merchant_idx").on(table.merchantId)],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull(),
    merchantId: text("merchant_id").notNull().default("merchant_nova"),
    sessionId: text("session_id").notNull(),
    eventType: text("event_type").notNull(),
    detail: text("detail").notNull(),
    engine: text("engine").notNull().default("system"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("audit_event_id_idx").on(table.eventId),
    index("audit_merchant_idx").on(table.merchantId),
  ],
);

export const checkoutEvents = sqliteTable(
  "checkout_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    checkoutId: text("checkout_id").notNull().unique(),
    merchantId: text("merchant_id").notNull().default("merchant_nova"),
    customerId: text("customer_id"),
    customerEmail: text("customer_email"),
    orderNumber: text("order_number"),
    sessionId: text("session_id").notNull(),
    productId: integer("product_id").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("checkout_merchant_idx").on(table.merchantId),
    index("checkout_customer_idx").on(table.customerId),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("customer_email_idx").on(table.email)],
);

export const customerOtps = sqliteTable(
  "customer_otps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    consumed: integer("consumed").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("customer_otp_email_idx").on(table.email)],
);
