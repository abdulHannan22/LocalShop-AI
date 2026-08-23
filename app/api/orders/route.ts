import { listCheckouts, updateCheckoutStatus } from "../../../lib/audit-store";
import { listProducts } from "../../../lib/product-store";
import { can, getActor } from "../../../lib/authz";
import { saveAudit } from "../../../lib/audit-store";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor?.merchantId || !can(actor, "orders:read")) return Response.json({ error: "Order-read permission is required." }, { status: actor ? 403 : 401 });
  const [orders, products] = await Promise.all([listCheckouts(50, actor.merchantId), listProducts(actor.merchantId)]);
  const names = new Map(products.map((product) => [product.id, product.name]));
  return Response.json({
    orders: orders.map((order) => ({
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
  if (!checkoutId || !["ready", "created", "paid", "fulfilled", "cancelled"].includes(status)) {
    return Response.json({ error: "Valid checkout and status are required." }, { status: 400 });
  }
  const order = await updateCheckoutStatus(checkoutId, status, actor.merchantId);
  if (!order) return Response.json({ error: "Order not found or storage is unavailable." }, { status: 404 });
  await saveAudit({ merchantId: actor.merchantId, sessionId: order.sessionId, eventType: "order.status_changed", detail: `${checkoutId} changed to ${status} by ${actor.email}`, engine: "system" });
  return Response.json({ order });
}
