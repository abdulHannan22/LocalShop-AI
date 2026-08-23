import { saveAudit } from "../../../lib/audit-store";
import { rankProducts } from "../../../lib/catalog";
import { extractShoppingIntent } from "../../../lib/gemini";
import { listProducts } from "../../../lib/product-store";
import { getActor, resolveMerchantBySlug } from "../../../lib/authz";
import { saveShoppingSession } from "../../../lib/session-store";

export async function POST(request: Request) {
  let payload: { query?: string; storeSlug?: string; customerEmail?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const query = payload.query?.trim() ?? "";
  if (query.length < 5 || query.length > 500) {
    return Response.json(
      { error: "Describe the product need in 5 to 500 characters." },
      { status: 400 },
    );
  }

  const sessionId = crypto.randomUUID();
  const actor = payload.storeSlug ? null : await getActor(request);
  const merchant = payload.storeSlug
    ? await resolveMerchantBySlug(payload.storeSlug)
    : actor?.merchantId
      ? { id: actor.merchantId }
      : null;
  if (!merchant) return Response.json({ error: "A valid store is required." }, { status: 404 });
  const { intent, engine } = await extractShoppingIntent(query);
  const catalogue = await listProducts(merchant.id);
  const products = rankProducts(intent, catalogue);
  const audit = [
    { event: "intent.extracted", detail: intent.explanation, engine },
    {
      event: "catalogue.queried",
      detail: `${products.length} products ranked`,
      engine: "rules",
    },
    {
      event: "inventory.verified",
      detail: "Out-of-stock products removed",
      engine: "rules",
    },
  ];

  await Promise.all(
    audit.map((item) =>
      saveAudit({
        merchantId: merchant.id,
        sessionId,
        eventType: item.event,
        detail: item.detail,
        engine: item.engine,
      }),
    ),
  );

  await saveShoppingSession({
    id: sessionId,
    merchantId: merchant.id,
    customerEmail: payload.customerEmail,
    query,
    intent,
    engine,
  });

  return Response.json({ sessionId, query, intent, engine, products, audit });
}
