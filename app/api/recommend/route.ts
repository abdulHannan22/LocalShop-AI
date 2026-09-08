import { countTodayGeminiCalls, saveAudit } from "../../../lib/audit-store";
import { assessMatchQuality, rankProducts } from "../../../lib/catalog";
import { extractShoppingIntent } from "../../../lib/gemini";
import { listProducts } from "../../../lib/product-store";
import { getActor, resolveMerchantBySlug } from "../../../lib/authz";
import { getRuntimeValue } from "../../../lib/runtime-env";
import { saveShoppingSession } from "../../../lib/session-store";
import { checkRateLimit, clientIp, rateLimitResponse } from "../../../lib/rate-limit";
import { errorResponse } from "../../../lib/api-errors";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientIp(request), "recommend");
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

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

  try {
  const sessionId = crypto.randomUUID();
  const actor = payload.storeSlug ? null : await getActor(request);
  const merchant = payload.storeSlug
    ? await resolveMerchantBySlug(payload.storeSlug)
    : actor?.merchantId
      ? { id: actor.merchantId }
      : null;
  if (!merchant) return Response.json({ error: "A valid store is required." }, { status: 404 });

  // Run intent extraction and catalogue fetch in parallel to cut latency.
  const geminiDailyLimit = Number(getRuntimeValue("GEMINI_DAILY_LIMIT") ?? "200");
  const [geminiCallsToday, catalogue] = await Promise.all([
    countTodayGeminiCalls(merchant.id),
    listProducts(merchant.id),
  ]);
  const rateLimited = geminiCallsToday >= geminiDailyLimit;
  const { intent, engine } = await extractShoppingIntent(query, { forceRules: rateLimited });
  const products = rankProducts(intent, catalogue);
  const matchQuality = assessMatchQuality(products);
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
    {
      event: "match.assessed",
      detail:
        matchQuality === "none"
          ? "No confident match — falling back to browsing"
          : `Match quality: ${matchQuality}`,
      engine: "rules",
    },
    ...(rateLimited
      ? [
          {
            event: "gemini.rate_limited",
            detail: `Daily Gemini cap (${geminiDailyLimit}) reached — used deterministic fallback instead`,
            engine: "system",
          },
        ]
      : []),
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
    matchQuality,
    topProductId: matchQuality === "none" ? null : products[0]?.id ?? null,
  });

  return Response.json({ sessionId, query, intent, engine, products, matchQuality, audit });
  } catch (error) {
    return errorResponse(error, "recommend", "We couldn't process your request right now. Please try again in a few moments.");
  }
}