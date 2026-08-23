import { getDb } from "../db";
import { shoppingSessions } from "../db/schema";
import type { ShoppingIntent } from "./catalog";
import { ensureRuntimeSchema } from "./db-init";

type SessionRecord = {
  id: string;
  merchantId: string;
  customerEmail: string | null;
  query: string;
  intentJson: string;
  engine: string;
  status: string;
  createdAt: string;
};

let fallbackSessions: SessionRecord[] = [];

export async function saveShoppingSession(input: {
  id: string;
  merchantId: string;
  customerEmail?: string;
  query: string;
  intent: ShoppingIntent;
  engine: string;
}) {
  const values = {
    id: input.id,
    merchantId: input.merchantId,
    customerEmail: input.customerEmail?.trim().toLowerCase() || null,
    query: input.query,
    intentJson: JSON.stringify(input.intent),
    engine: input.engine,
    status: "active",
  };
  try {
    await ensureRuntimeSchema();
    await getDb().insert(shoppingSessions).values(values);
    return true;
  } catch {
    fallbackSessions.push({ ...values, createdAt: new Date().toISOString() });
    return false;
  }
}
