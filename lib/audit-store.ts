import { prisma } from "./prisma";
import { DEMO_MERCHANT_ID } from "./authz";

export type AuditInput = {
  eventId?: string;
  merchantId?: string;
  sessionId: string;
  eventType: string;
  detail: string;
  engine?: string;
};

export async function saveAudit(input: AuditInput) {
  const eventId = input.eventId ?? crypto.randomUUID();
  await prisma.auditEvent.create({
    data: {
      eventId,
      merchantId: input.merchantId ?? DEMO_MERCHANT_ID,
      sessionId: input.sessionId,
      eventType: input.eventType,
      detail: input.detail,
      engine: input.engine ?? "system",
    },
  });
  return { eventId, stored: true };
}

export async function hasAuditEvent(eventId: string) {
  const existing = await prisma.auditEvent.findFirst({ where: { eventId }, select: { id: true } });
  return Boolean(existing);
}

export async function listAudit(sessionId: string, merchantId = DEMO_MERCHANT_ID) {
  return prisma.auditEvent.findMany({
    where: { sessionId, merchantId },
    orderBy: { id: "desc" },
    take: 30,
  });
}

export async function listRecentAudit(limit = 60, merchantId = DEMO_MERCHANT_ID) {
  return prisma.auditEvent.findMany({
    where: { merchantId },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

export async function countTodayGeminiCalls(merchantId = DEMO_MERCHANT_ID) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  return prisma.auditEvent.count({
    where: {
      merchantId,
      eventType: "intent.extracted",
      engine: "gemini",
      createdAt: { gte: startOfDay },
    },
  });
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
  await prisma.checkoutEvent.create({
    data: { ...input, merchantId: input.merchantId ?? DEMO_MERCHANT_ID },
  });
  return true;
}

export async function listCheckoutsForCustomer(customerId: string, limit = 50) {
  return prisma.checkoutEvent.findMany({
    where: { customerId },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

export async function getCheckoutForCustomer(checkoutId: string, customerId: string) {
  return prisma.checkoutEvent.findFirst({ where: { checkoutId, customerId } });
}

export async function updateCheckoutStatusForCustomer(checkoutId: string, customerId: string, status: string) {
  const result = await prisma.checkoutEvent.updateMany({
    where: { checkoutId, customerId },
    data: { status },
  });
  if (result.count === 0) return null;
  return prisma.checkoutEvent.findFirst({ where: { checkoutId, customerId } });
}

export async function listCheckouts(limit = 50, merchantId = DEMO_MERCHANT_ID) {
  return prisma.checkoutEvent.findMany({
    where: { merchantId },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

export async function updateCheckoutStatus(checkoutId: string, status: string, merchantId = DEMO_MERCHANT_ID) {
  const result = await prisma.checkoutEvent.updateMany({
    where: { checkoutId, merchantId },
    data: { status },
  });
  if (result.count === 0) return null;
  return prisma.checkoutEvent.findFirst({ where: { checkoutId, merchantId } });
}

export async function updateCheckoutStatusBySession(sessionId: string, status: string, merchantId = DEMO_MERCHANT_ID) {
  const result = await prisma.checkoutEvent.updateMany({
    where: { sessionId, merchantId },
    data: { status },
  });
  if (result.count === 0) return null;
  return prisma.checkoutEvent.findFirst({ where: { sessionId, merchantId } });
}
