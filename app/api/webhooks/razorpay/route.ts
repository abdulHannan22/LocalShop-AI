import { hasAuditEvent, saveAudit, updateCheckoutStatusByProviderReference, updateCheckoutStatusBySession } from "../../../../lib/audit-store";
import { DEMO_MERCHANT_ID } from "../../../../lib/authz";
import { getRuntimeValue } from "../../../../lib/runtime-env";
import { checkRateLimit, clientIp, rateLimitResponse } from "../../../../lib/rate-limit";
import { errorResponse } from "../../../../lib/api-errors";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifySignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  return safeEqual(toHex(digest), signature.toLowerCase());
}

function findSessionId(payload: Record<string, unknown> | undefined) {
  try {
    const paymentLink = payload?.payment_link as Record<string, unknown>;
    const entity = paymentLink.entity as Record<string, unknown>;
    const notes = entity.notes as Record<string, unknown>;
    return String(notes.localshop_session || "unlinked");
  } catch {
    return "unlinked";
  }
}

function findMerchantId(payload: Record<string, unknown> | undefined) {
  try {
    const paymentLink = payload?.payment_link as Record<string, unknown>;
    const entity = paymentLink.entity as Record<string, unknown>;
    const notes = entity.notes as Record<string, unknown>;
    return String(notes.merchant_id || DEMO_MERCHANT_ID);
  } catch {
    return DEMO_MERCHANT_ID;
  }
}

function findOrderId(payload: Record<string, unknown> | undefined) {
  try {
    const payment = payload?.payment as Record<string, unknown>;
    const entity = payment.entity as Record<string, unknown>;
    if (entity.order_id) return String(entity.order_id);
    const order = payload?.order as Record<string, unknown>;
    const orderEntity = order.entity as Record<string, unknown>;
    return String(orderEntity.id || "");
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientIp(request), "webhook");
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const secret = getRuntimeValue("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    return Response.json({ error: "Webhook secret is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const rawBody = await request.text();
  if (!signature || !(await verifySignature(rawBody, signature, secret))) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  if (eventId && (await hasAuditEvent(eventId))) {
    return Response.json({ accepted: true, duplicate: true });
  }

  let event: { event?: string; payload?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return Response.json({ error: "Webhook JSON is invalid." }, { status: 400 });
  }

  const merchantId = findMerchantId(event.payload);
  const sessionId = findSessionId(event.payload);
  try {
    if (event.event === "payment_link.paid") {
      await updateCheckoutStatusBySession(sessionId, "paid", merchantId);
    }
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const orderId = findOrderId(event.payload);
      if (orderId) await updateCheckoutStatusByProviderReference(orderId, "paid");
    }
    await saveAudit({
    eventId: eventId || crypto.randomUUID(),
    merchantId,
    sessionId,
    eventType: `webhook.${event.event ?? "unknown"}`,
    detail: "Razorpay webhook signature verified and event accepted",
    engine: "razorpay",
  });
  } catch (error) {
    return errorResponse(error, "webhook", "We could not record this payment event. Razorpay will retry the delivery.");
  }
  return Response.json({ accepted: true, duplicate: false });
}

export async function GET() {
  return Response.json({ error: "Use POST to deliver Razorpay webhook events." }, { status: 405 });
}
