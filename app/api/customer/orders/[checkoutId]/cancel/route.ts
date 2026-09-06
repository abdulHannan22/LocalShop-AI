import { resolveCustomer } from "../../../../../../lib/customer-auth";
import { updateCheckoutStatusForCustomer } from "../../../../../../lib/audit-store";

const CANCELLABLE_STATUSES = ["ready", "created", "paid", "packed"];

export async function POST(request: Request, { params }: { params: { checkoutId: string } }) {
  const customer = await resolveCustomer(request);
  if (!customer) {
    return Response.json({ error: "Sign in to cancel orders." }, { status: 401 });
  }

  const { checkoutId } = params;
  const { prisma } = await import("../../../../../../lib/prisma");
  const order = await prisma.checkoutEvent.findFirst({ where: { checkoutId, customerId: customer.id } });

  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return Response.json({ error: "This order cannot be cancelled." }, { status: 409 });
  }

  const updated = await updateCheckoutStatusForCustomer(checkoutId, customer.id, "cancellation_requested");
  return Response.json({ order: updated });
}
