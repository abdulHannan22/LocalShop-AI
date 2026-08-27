import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { shoppingSessions } from "../db/schema";
import type { MatchQuality, ShoppingIntent } from "./catalog";
import { ensureRuntimeSchema } from "./db-init";

type SessionRecord = {
  id: string;
  merchantId: string;
  customerEmail: string | null;
  query: string;
  intentJson: string;
  engine: string;
  status: string;
  matchQuality: string | null;
  topProductId: number | null;
  createdAt: string;
};

const fallbackSessions: SessionRecord[] = [];

export async function saveShoppingSession(input: {
  id: string;
  merchantId: string;
  customerEmail?: string;
  query: string;
  intent: ShoppingIntent;
  engine: string;
  matchQuality?: MatchQuality;
  topProductId?: number | null;
}) {
  const values = {
    id: input.id,
    merchantId: input.merchantId,
    customerEmail: input.customerEmail?.trim().toLowerCase() || null,
    query: input.query,
    intentJson: JSON.stringify(input.intent),
    engine: input.engine,
    status: "active",
    matchQuality: input.matchQuality ?? null,
    topProductId: input.topProductId ?? null,
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

export async function getShoppingSession(id: string, merchantId: string) {
  try {
    await ensureRuntimeSchema();
    const [row] = await getDb()
      .select()
      .from(shoppingSessions)
      .where(eq(shoppingSessions.id, id))
      .limit(1);
    return row && row.merchantId === merchantId ? row : null;
  } catch {
    return fallbackSessions.find((session) => session.id === id && session.merchantId === merchantId) ?? null;
  }
}