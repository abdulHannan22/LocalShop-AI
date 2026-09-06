import { listCheckouts, updateCheckoutStatus, saveAudit } from "../../../lib/audit-store";
import { listProducts } from "../../../lib/product-store";
import { can, getActor } from "../../../lib/authz";
import { sendTransactionalEmail } from "../../../lib/email";

const ORDER_STATUSES = ["ready", "created", "paid", "packed", "shipped", "delivered", "cancellation_requested", "cancelled"];

const STATUS_MESSAGES: Record<string, string> = {
  packed: "Your order has been packed and is ready to ship.",
  shipped: "Your order is on its way.",
  delivered: "Your order has been delivered. Enjoy!",
  cancelled: "Your order has been cancelled.",
};

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor?.merchantId || !can(actor, "orders:read")) return Response.json({ error: "Order-read permission is required." }, { status: actor ? 403 : 401 });
  const [orders, products] = await Promise.all([listCheckouts(50, actor.merchantId), listProducts(actor.merchantId)]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  type OrderRow = (typeof orders)[number];
  return Response.json({
    orders: orders.map((order: OrderRow) => ({
      ...order,
      productName: names.get(order.productId) ?? `Product #${order.productId}`,
    })),
  });
}

export async function PATCH(request: Request) {
  const actor = await getActor(request);
  if (!actor?.merchantId || !can(actor, "orders:write")) return Response.json({ error: "Order-write permission is required." }, { status: actor ? 403 : 401 });
  const body = (await request.json()) as { checkoutId?: string; status?: string };
  const checkoutId = body.checkoutId?.trim() ?? "";
  const status = body.status?.trim() ?? "";
  if (!checkoutId || !ORDER_STATUSES.includes(status)) {
    return Response.json({ error: "Valid checkout and status are required." }, { status: 400 });
  }
  const order = await updateCheckoutStatus(checkoutId, status, actor.merchantId);
  if (!order) return Response.json({ error: "Order not found or storage is unavailable." }, { status: 404 });
  await saveAudit({ merchantId: actor.merchantId, sessionId: order.sessionId, eventType: "order.status_changed", detail: `${checkoutId} changed to ${status} by ${actor.email}`, engine: "system" });

  const notificationText = STATUS_MESSAGES[status];
  if (notificationText && order.customerEmail) {
    const result = await sendTransactionalEmail({
      to: order.customerEmail,
      subject: `LocalShop AI order ${order.orderNumber ?? checkoutId}: ${status}`,
      text: notificationText,
    });
    await saveAudit({
      merchantId: actor.merchantId,
      sessionId: order.sessionId,
      eventType: result.sent ? "notification.email_sent" : "notification.email_skipped",
      detail: result.sent
        ? `Status update emailed to ${order.customerEmail}`
        : `Email not sent (${"reason" in result ? result.reason : "unknown"}) — no provider configured or delivery failed`,
      engine: "system",
    });
  }

  return Response.json({ order });
}
