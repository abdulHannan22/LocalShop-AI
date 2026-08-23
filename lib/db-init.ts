import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

const statements = [
  `CREATE TABLE IF NOT EXISTS merchants (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS merchant_slug_idx ON merchants (slug)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, name TEXT, platform_role TEXT NOT NULL DEFAULT 'user', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON users (email)`,
  `CREATE TABLE IF NOT EXISTS memberships (id TEXT PRIMARY KEY NOT NULL, merchant_id TEXT NOT NULL, user_id TEXT, email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'invited', invited_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS membership_merchant_email_idx ON memberships (merchant_id, email)`,
  `CREATE INDEX IF NOT EXISTS membership_user_idx ON memberships (user_id)`,
  `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, merchant_id TEXT NOT NULL DEFAULT 'merchant_nova', name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, rating REAL NOT NULL DEFAULT 4.5, inventory INTEGER NOT NULL DEFAULT 0, description TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', accent TEXT NOT NULL DEFAULT 'lime', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS product_merchant_idx ON products (merchant_id)`,
  `CREATE TABLE IF NOT EXISTS shopping_sessions (id TEXT PRIMARY KEY NOT NULL, merchant_id TEXT NOT NULL, customer_email TEXT, query TEXT NOT NULL, intent_json TEXT NOT NULL, engine TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS shopping_session_merchant_idx ON shopping_sessions (merchant_id)`,
  `CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, event_id TEXT NOT NULL, merchant_id TEXT NOT NULL DEFAULT 'merchant_nova', session_id TEXT NOT NULL, event_type TEXT NOT NULL, detail TEXT NOT NULL, engine TEXT NOT NULL DEFAULT 'system', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS audit_event_id_idx ON audit_events (event_id)`,
  `CREATE INDEX IF NOT EXISTS audit_merchant_idx ON audit_events (merchant_id)`,
  `CREATE TABLE IF NOT EXISTS checkout_events (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, checkout_id TEXT NOT NULL UNIQUE, merchant_id TEXT NOT NULL DEFAULT 'merchant_nova', customer_email TEXT, order_number TEXT, session_id TEXT NOT NULL, product_id INTEGER NOT NULL, amount_paise INTEGER NOT NULL, provider TEXT NOT NULL, provider_reference TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS checkout_merchant_idx ON checkout_events (merchant_id)`,
];

export async function ensureRuntimeSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    if (!env.DB) throw new Error("D1 binding is unavailable");
    await env.DB.batch(statements.map((statement) => env.DB!.prepare(statement)));
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}
