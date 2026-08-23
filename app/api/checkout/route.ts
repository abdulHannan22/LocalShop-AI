import { saveAudit, saveCheckout } from "../../../lib/audit-store";
import { getStoredProduct } from "../../../lib/product-store";
import { getRuntimeValue } from "../../../lib/runtime-env";
import { getActor, resolveMerchantBySlug } from "../../../lib/authz";

type RazorpayPaymentLink = {
  id?: string;
  short_url?: string;
  status?: string;
  error?: { description?: string };
};

export async function POST(request: Request) {
  let payload: {
    sessionId?: string;
    productId?: number;
    confirmed?: boolean;
    storeSlug?: string;
    customerEmail?: string;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const sessionId = payload.sessionId?.trim() ?? "";
  const productId = Number(payload.productId);
  if (!sessionId || !Number.isInteger(productId)) {
    return Response.json({ error: "A valid session and product are required." }, { status: 400 });
  }
  if (payload.confirmed !== true) {
    return Response.json(
      { error: "Customer confirmation is required before checkout." },
      { status: 409 },
    );
  }

  const actor = payload.storeSlug ? null : await getActor(request);
  const merchant = payload.storeSlug
    ? await resolveMerchantBySlug(payload.storeSlug)
    : actor?.merchantId
      ? { id: actor.merchantId }
      : null;
  if (!merchant) return Response.json({ error: "A valid store is required." }, { status: 404 });

  const product = await getStoredProduct(productId, merchant.id);
  if (!product || product.inventory < 1) {
    return Response.json({ error: "The selected product is unavailable." }, { status: 404 });
  }

  const checkoutId = crypto.randomUUID();
  const orderNumber = `LSA-${Date.now().toString(36).toUpperCase()}`;
  const amountPaise = product.price * 100;
  const keyId = getRuntimeValue("RAZORPAY_KEY_ID");
  const keySecret = getRuntimeValue("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    await saveCheckout({
      checkoutId,
      merchantId: merchant.id,
      customerEmail: payload.customerEmail,
      orderNumber,
      sessionId,
      productId,
      amountPaise,
      provider: "simulation",
      status: "ready",
    });
    await saveAudit({
      merchantId: merchant.id,
      sessionId,
      eventType: "checkout.simulated",
      detail: `Confirmation accepted for ${product.name}; no Razorpay keys configured`,
      engine: "system",
    });
    return Response.json({
      checkoutId,
      orderNumber,
      mode: "simulation",
      status: "ready",
      checkoutUrl: null,
      message:
        "Safe simulation completed. Add Razorpay test keys to create a real test Payment Link.",
    });
  }

  const referenceId = `lsa_${Date.now()}_${productId}`.slice(0, 40);
  const response = await fetch("https://api.razorpay.com/v1/payment_links/", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: referenceId,
      description: `LocalShop AI order: ${product.name}`,
      reminder_enable: false,
      notes: {
        merchant_id: merchant.id,
        localshop_session: sessionId,
        product_id: String(product.id),
      },
    }),
  });

  const paymentLink = (await response.json()) as RazorpayPaymentLink;
  if (!response.ok || !paymentLink.short_url || !paymentLink.id) {
    await saveAudit({
      merchantId: merchant.id,
      sessionId,
      eventType: "checkout.failed",
      detail:
        paymentLink.error?.description ?? `Razorpay returned ${response.status}`,
      engine: "razorpay",
    });
    return Response.json(
      {
        error:
          "Razorpay test checkout could not be created. Verify the test keys and account configuration.",
      },
      { status: 502 },
    );
  }

  await saveCheckout({
    checkoutId,
    merchantId: merchant.id,
    customerEmail: payload.customerEmail,
    orderNumber,
    sessionId,
    productId,
    amountPaise,
    provider: "razorpay",
    providerReference: paymentLink.id,
    status: paymentLink.status ?? "created",
  });
  await saveAudit({
    merchantId: merchant.id,
    sessionId,
    eventType: "checkout.created",
    detail: `Razorpay test Payment Link ${paymentLink.id} created after confirmation`,
    engine: "razorpay",
  });

  return Response.json({
    checkoutId,
    orderNumber,
    mode: "razorpay-test",
    status: paymentLink.status ?? "created",
    checkoutUrl: paymentLink.short_url,
    message: "Razorpay test Payment Link created successfully.",
  });
}
