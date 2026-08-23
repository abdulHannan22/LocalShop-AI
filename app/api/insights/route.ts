import { listCheckouts, listRecentAudit } from "../../../lib/audit-store";
import { listProducts } from "../../../lib/product-store";
import { can, getActor } from "../../../lib/authz";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor?.merchantId || !can(actor, "insights:read")) return Response.json({ error: "Insights permission is required." }, { status: actor ? 403 : 401 });
  const [products, orders, audit] = await Promise.all([
    listProducts(actor.merchantId),
    listCheckouts(100, actor.merchantId),
    listRecentAudit(100, actor.merchantId),
  ]);
  const inventoryUnits = products.reduce((sum, product) => sum + product.inventory, 0);
  const revenuePaise = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.amountPaise, 0);
  return Response.json({
    metrics: {
      products: products.length,
      inventoryUnits,
      lowStock: products.filter((product) => product.inventory < 10).length,
      orders: orders.length,
      potentialRevenue: Math.round(revenuePaise / 100),
      aiSessions: new Set(audit.map((event) => event.sessionId)).size,
    },
    lowStock: products.filter((product) => product.inventory < 10).sort((a, b) => a.inventory - b.inventory),
    recentOrders: orders.slice(0, 5),
  });
}
