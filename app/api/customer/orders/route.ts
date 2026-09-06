import { prisma } from "../../../../lib/prisma";
import { listCheckoutsForCustomer } from "../../../../lib/audit-store";
import { resolveCustomer } from "../../../../lib/customer-auth";

const CANCELLABLE_STATUSES = ["ready", "created", "paid", "packed"];

export async function GET(request: Request) {
  const customer = await resolveCustomer(request);
  if (!customer) {
    return Response.json({ error: "Sign in to view your orders." }, { status: 401 });
  }

  const orders = await listCheckoutsForCustomer(customer.id);

  const productIds = [...new Set(orders.map((o: { productId: number }) => o.productId))];
  const merchantIds = [...new Set(orders.map((o: { merchantId: string }) => o.merchantId))];

  const [productRows, merchantRows] = await Promise.all([
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [],
    merchantIds.length ? prisma.merchant.findMany({ where: { id: { in: merchantIds } }, select: { id: true, name: true, slug: true } }) : [],
  ]);

  const productNames = new Map(productRows.map((r: { id: number; name: string }) => [r.id, r.name]));
  const merchantNames = new Map(merchantRows.map((r: { id: string; name: string; slug: string }) => [r.id, { name: r.name, slug: r.slug }]));

  type Order = (typeof orders)[number];
  const enriched = orders.map((order: Order) => ({
    checkoutId: order.checkoutId,
    orderNumber: order.orderNumber,
    productId: order.productId,
    productName: productNames.get(order.productId) ?? null,
    merchantId: order.merchantId,
    storeName: merchantNames.get(order.merchantId)?.name ?? null,
    storeSlug: merchantNames.get(order.merchantId)?.slug ?? null,
    amountPaise: order.amountPaise,
    provider: order.provider,
    status: order.status,
    cancellable: CANCELLABLE_STATUSES.includes(order.status),
    createdAt: order.createdAt,
  }));

  return Response.json({ customer, orders: enriched });
}
