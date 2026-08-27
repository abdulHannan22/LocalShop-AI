import { countTodayGeminiCalls, listCheckouts, listRecentAudit } from "../../../lib/audit-store";
import { listProducts } from "../../../lib/product-store";
import { can, getActor } from "../../../lib/authz";
import { getRuntimeValue } from "../../../lib/runtime-env";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor?.merchantId || !can(actor, "insights:read")) return Response.json({ error: "Insights permission is required." }, { status: actor ? 403 : 401 });
  const [products, orders, audit, geminiCallsToday] = await Promise.all([
    listProducts(actor.merchantId),
    listCheckouts(100, actor.merchantId),
    listRecentAudit(200, actor.merchantId),
    countTodayGeminiCalls(actor.merchantId),
  ]);
  const geminiDailyLimit = Number(getRuntimeValue("GEMINI_DAILY_LIMIT") ?? "200");
  const inventoryUnits = products.reduce((sum, product) => sum + product.inventory, 0);
  const revenuePaise = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.amountPaise, 0);

  const hits = audit.filter((event) => event.eventType === "recommendation.hit").length;
  const misses = audit.filter((event) => event.eventType === "recommendation.miss").length;
  const recommendationOutcomes = hits + misses;

  return Response.json({
    metrics: {
      products: products.length,
      inventoryUnits,
      lowStock: products.filter((product) => product.inventory < 10).length,
      orders: orders.length,
      potentialRevenue: Math.round(revenuePaise / 100),
      aiSessions: new Set(audit.map((event) => event.sessionId)).size,
      recommendationHitRate: recommendationOutcomes ? Math.round((hits / recommendationOutcomes) * 100) : null,
      recommendationOutcomes,
      geminiCallsToday,
      geminiDailyLimit,
    },
    lowStock: products.filter((product) => product.inventory < 10).sort((a, b) => a.inventory - b.inventory),
    recentOrders: orders.slice(0, 5),
  });
}