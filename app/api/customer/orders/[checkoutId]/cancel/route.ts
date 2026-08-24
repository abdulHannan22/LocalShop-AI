import { getCheckoutForCustomer, saveAudit, updateCheckoutStatusForCustomer } from "../../../../../../lib/audit-store";
import { resolveCustomer } from "../../../../../../lib/customer-auth";

const CANCELLABLE_STATUSES = ["ready", "created", "paid", "packed"];

export async function POST(request: Request, { params }: { params: Promise<{ checkoutId: string }> }) {
  const customer = await resolveCustomer(request);
  if (!customer) {
    return Response.json({ error: "Sign in to manage your orders." }, { status: 401 });
  }

  const { checkoutId } = await params;
  const order = await getCheckoutForCustomer(checkoutId, customer.id);
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return Response.json(
      { error: `This order can no longer be cancelled (current status: ${order.status}).` },
      { status: 409 },
    );
  }

  const updated = await updateCheckoutStatusForCustomer(checkoutId, customer.id, "cancellation_requested");
  if (!updated) {
    return Response.json({ error: "Could not update the order. Try again shortly." }, { status: 500 });
  }

  await saveAudit({
    merchantId: order.merchantId,
    sessionId: order.sessionId,
    eventType: "order.cancellation_requested",
    detail: `${checkoutId} cancellation requested by customer ${customer.email}`,
    engine: "system",
  });

  return Response.json({ order: updated });
}
