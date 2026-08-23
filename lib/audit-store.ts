import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { auditEvents, checkoutEvents } from "../db/schema";
import { DEMO_MERCHANT_ID } from "./authz";
import { ensureRuntimeSchema } from "./db-init";

export type AuditInput = {
  eventId?: string;
  merchantId?: string;
  sessionId: string;
  eventType: string;
  detail: string;
  engine?: string;
};

type FallbackAuditEvent = AuditInput & {
  id: number;
  eventId: string;
  engine: string;
  createdAt: string;
};

type FallbackCheckout = {
  id: number;
  checkoutId: string;
  merchantId: string;
  customerId: string | null;
  customerEmail: string | null;
  orderNumber: string | null;
  sessionId: string;
  productId: number;
  amountPaise: number;
  provider: string;
  providerReference: string | null;
  status: string;
  createdAt: string;
};

let fallbackAudit: FallbackAuditEvent[] = [];
let fallbackCheckouts: FallbackCheckout[] = [];

export async function saveAudit(input: AuditInput) {
  const eventId = input.eventId ?? crypto.randomUUID();
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    await db.insert(auditEvents).values({
      eventId,
      merchantId: input.merchantId ?? DEMO_MERCHANT_ID,
      sessionId: input.sessionId,
      eventType: input.eventType,
      detail: input.detail,
      engine: input.engine ?? "system",
    });
    return { eventId, stored: true };
  } catch {
    fallbackAudit.push({
      ...input,
      id: fallbackAudit.length + 1,
      eventId,
      engine: input.engine ?? "system",
      createdAt: new Date().toISOString(),
    });
    return { eventId, stored: false };
  }
}

export async function hasAuditEvent(eventId: string) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    const [existing] = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(eq(auditEvents.eventId, eventId))
      .limit(1);
    return Boolean(existing);
  } catch {
    return fallbackAudit.some((event) => event.eventId === eventId);
  }
}

export async function listAudit(sessionId: string, merchantId = DEMO_MERCHANT_ID) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    return await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.sessionId, sessionId), eq(auditEvents.merchantId, merchantId)))
      .orderBy(desc(auditEvents.id))
      .limit(30);
  } catch {
    return fallbackAudit
      .filter((event) => event.sessionId === sessionId && (event.merchantId ?? DEMO_MERCHANT_ID) === merchantId)
      .slice(-30)
      .reverse();
  }
}

export async function listRecentAudit(limit = 60, merchantId = DEMO_MERCHANT_ID) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    return await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.merchantId, merchantId))
      .orderBy(desc(auditEvents.id))
      .limit(Math.min(Math.max(limit, 1), 100));
  } catch {
    return fallbackAudit.filter((event) => (event.merchantId ?? DEMO_MERCHANT_ID) === merchantId).slice(-Math.min(Math.max(limit, 1), 100)).reverse();
  }
}

export async function saveCheckout(input: {
  checkoutId: string;
  merchantId?: string;
  customerId?: string;
  customerEmail?: string;
  orderNumber?: string;
  sessionId: string;
  productId: number;
  amountPaise: number;
  provider: string;
  providerReference?: string;
  status: string;
}) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    await db.insert(checkoutEvents).values({ ...input, merchantId: input.merchantId ?? DEMO_MERCHANT_ID });
    return true;
  } catch {
    fallbackCheckouts.push({
      id: fallbackCheckouts.length + 1,
      ...input,
      merchantId: input.merchantId ?? DEMO_MERCHANT_ID,
      customerId: input.customerId ?? null,
      customerEmail: input.customerEmail ?? null,
      orderNumber: input.orderNumber ?? null,
      providerReference: input.providerReference ?? null,
      createdAt: new Date().toISOString(),
    });
    return false;
  }
}

export async function listCheckoutsForCustomer(customerId: string, limit = 50) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    return await db
      .select()
      .from(checkoutEvents)
      .where(eq(checkoutEvents.customerId, customerId))
      .orderBy(desc(checkoutEvents.id))
      .limit(Math.min(Math.max(limit, 1), 100));
  } catch {
    return fallbackCheckouts
      .filter((order) => order.customerId === customerId)
      .slice(-Math.min(Math.max(limit, 1), 100))
      .reverse();
  }
}

export async function listCheckouts(limit = 50, merchantId = DEMO_MERCHANT_ID) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    return await db
      .select()
      .from(checkoutEvents)
      .where(eq(checkoutEvents.merchantId, merchantId))
      .orderBy(desc(checkoutEvents.id))
      .limit(Math.min(Math.max(limit, 1), 100));
  } catch {
    return fallbackCheckouts.filter((order) => order.merchantId === merchantId).slice(-Math.min(Math.max(limit, 1), 100)).reverse();
  }
}

export async function updateCheckoutStatus(checkoutId: string, status: string, merchantId = DEMO_MERCHANT_ID) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    const result = await db
      .update(checkoutEvents)
      .set({ status })
      .where(and(eq(checkoutEvents.checkoutId, checkoutId), eq(checkoutEvents.merchantId, merchantId)))
      .returning();
    return result[0] ?? null;
  } catch {
    const index = fallbackCheckouts.findIndex((order) => order.checkoutId === checkoutId && order.merchantId === merchantId);
    if (index < 0) return null;
    fallbackCheckouts[index] = { ...fallbackCheckouts[index], status };
    return fallbackCheckouts[index];
  }
}

export async function updateCheckoutStatusBySession(
  sessionId: string,
  status: string,
  merchantId = DEMO_MERCHANT_ID,
) {
  try {
    await ensureRuntimeSchema();
    const result = await getDb()
      .update(checkoutEvents)
      .set({ status })
      .where(and(eq(checkoutEvents.sessionId, sessionId), eq(checkoutEvents.merchantId, merchantId)))
      .returning();
    return result[0] ?? null;
  } catch {
    const index = fallbackCheckouts.findIndex(
      (order) => order.sessionId === sessionId && order.merchantId === merchantId,
    );
    if (index < 0) return null;
    fallbackCheckouts[index] = { ...fallbackCheckouts[index], status };
    return fallbackCheckouts[index];
  }
}
