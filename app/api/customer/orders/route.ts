import { inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchants, products } from "../../../../db/schema";
import { listCheckoutsForCustomer } from "../../../../lib/audit-store";
import { resolveCustomer } from "../../../../lib/customer-auth";

const CANCELLABLE_STATUSES = ["ready", "created", "paid", "packed"];

export async function GET(request: Request) {
  const customer = await resolveCustomer(request);
  if (!customer) {
    return Response.json({ error: "Sign in to view your orders." }, { status: 401 });
  }

  const orders = await listCheckoutsForCustomer(customer.id);

  // Best-effort enrichment with product/store names; falls back to bare
  // order data (still fully usable) if D1 is unavailable.
  let productNames = new Map<number, string>();
  let merchantNames = new Map<string, { name: string; slug: string }>();
  try {
    const db = getDb();
    const productIds = [...new Set(orders.map((order) => order.productId))];
    const merchantIds = [...new Set(orders.map((order) => order.merchantId))];
    if (productIds.length) {
      const rows = await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, productIds));
      productNames = new Map(rows.map((row) => [row.id, row.name]));
    }
    if (merchantIds.length) {
      const rows = await db.select({ id: merchants.id, name: merchants.name, slug: merchants.slug }).from(merchants).where(inArray(merchants.id, merchantIds));
      merchantNames = new Map(rows.map((row) => [row.id, { name: row.name, slug: row.slug }]));
    }
  } catch {
    // fallback mode — leave names blank, the client shows the order number instead
  }

  const enriched = orders.map((order) => ({
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
