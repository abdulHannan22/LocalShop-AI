-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "platform_role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "invited_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "merchant_id" TEXT NOT NULL DEFAULT 'merchant_nova',
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "accent" TEXT NOT NULL DEFAULT 'lime',
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_sessions" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "customer_email" TEXT,
    "query" TEXT NOT NULL,
    "intent_json" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "match_quality" TEXT,
    "top_product_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shopping_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL DEFAULT 'merchant_nova',
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_events" (
    "id" SERIAL NOT NULL,
    "checkout_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL DEFAULT 'merchant_nova',
    "customer_id" TEXT,
    "customer_email" TEXT,
    "order_number" TEXT,
    "session_id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checkout_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_otps" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_password_resets" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "membership_user_idx" ON "memberships"("user_id");
CREATE UNIQUE INDEX "membership_merchant_email_idx" ON "memberships"("merchant_id", "email");
CREATE INDEX "product_merchant_idx" ON "products"("merchant_id");
CREATE INDEX "shopping_session_merchant_idx" ON "shopping_sessions"("merchant_id");
CREATE UNIQUE INDEX "audit_events_event_id_key" ON "audit_events"("event_id");
CREATE INDEX "audit_merchant_idx" ON "audit_events"("merchant_id");
CREATE UNIQUE INDEX "checkout_events_checkout_id_key" ON "checkout_events"("checkout_id");
CREATE INDEX "checkout_merchant_idx" ON "checkout_events"("merchant_id");
CREATE INDEX "checkout_customer_idx" ON "checkout_events"("customer_id");
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
CREATE INDEX "customer_otp_email_idx" ON "customer_otps"("email");
CREATE INDEX "merchant_password_reset_email_idx" ON "merchant_password_resets"("email");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
