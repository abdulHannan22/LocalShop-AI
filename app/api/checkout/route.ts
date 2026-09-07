import { saveAudit, saveCheckout } from "../../../lib/audit-store";
import { getStoredProduct } from "../../../lib/product-store";
import { prisma } from "../../../lib/prisma";
import { getRuntimeValue } from "../../../lib/runtime-env";
import { getActor, resolveMerchantBySlug } from "../../../lib/authz";
import { resolveCustomer } from "../../../lib/customer-auth";

type CartItem = { productId: number; quantity: number };

type RazorpayOrder = {
  id?: string;
  amount?: number;
  currency?: string;
  error?: { description?: string };
};

export async function POST(request: Request) {
  let payload: {
    sessionId?: string;
    // Single product (legacy)
    productId?: number;
    // Cart mode
    cart?: CartItem[];
    confirmed?: boolean;
    storeSlug?: string;
    customerEmail?: string;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const sessionId = payload.sessionId?.trim() || `checkout_${crypto.randomUUID()}`;
  if (payload.confirmed !== true) {
    return Response.json({ error: "Customer confirmation is required before checkout." }, { status: 409 });
  }

  // Normalise to cart array
  const cartItems: CartItem[] = payload.cart?.length
    ? payload.cart
    : payload.productId
      ? [{ productId: Number(payload.productId), quantity: 1 }]
      : [];

  if (!cartItems.length) return Response.json({ error: "Cart is empty." }, { status: 400 });
  for (const item of cartItems) {
    if (!Number.isInteger(item.productId) || item.quantity < 1) {
      return Response.json({ error: "Each cart item needs a valid productId and quantity ≥ 1." }, { status: 400 });
    }
  }

  const actor = payload.storeSlug ? null : await getActor(request);
  const merchant = payload.storeSlug
    ? await resolveMerchantBySlug(payload.storeSlug)
    : actor?.merchantId
      ? { id: actor.merchantId }
      : null;
  if (!merchant) return Response.json({ error: "A valid store is required." }, { status: 404 });

  // Validate all products
  const resolvedItems = await Promise.all(
    cartItems.map(async (item) => {
      const product = await getStoredProduct(item.productId, merchant.id);
      return { item, product };
    }),
  );

  for (const { item, product } of resolvedItems) {
    if (!product) return Response.json({ error: `Product ${item.productId} not found.` }, { status: 404 });
    if (product.inventory < item.quantity) {
      return Response.json({ error: `Only ${product.inventory} units of "${product.name}" available.` }, { status: 409 });
    }
  }

  const customer = await resolveCustomer(request);
  const customerId = customer?.id;
  const customerEmail = customer?.email ?? payload.customerEmail;

  const orderNumber = `LSA-${Date.now().toString(36).toUpperCase()}`;
  const totalAmountPaise = resolvedItems.reduce(
    (sum, { item, product }) => sum + product!.price * item.quantity * 100,
    0,
  );

  const keyId = getRuntimeValue("RAZORPAY_KEY_ID");
  const keySecret = getRuntimeValue("RAZORPAY_KEY_SECRET");

  // Save one checkout record per cart item
  const checkoutIds: string[] = [];
  for (const { item, product } of resolvedItems) {
    const checkoutId = crypto.randomUUID();
    checkoutIds.push(checkoutId);
    await saveCheckout({
      checkoutId,
      merchantId: merchant.id,
      customerId,
      customerEmail,
      orderNumber,
      sessionId,
      productId: item.productId,
      amountPaise: product!.price * item.quantity * 100,
      provider: keyId && keySecret ? "razorpay" : "simulation",
      status: "ready",
    });
  }

  if (!keyId || !keySecret) {
    await saveAudit({
      merchantId: merchant.id,
      sessionId,
      eventType: "checkout.simulated",
      detail: `Confirmation accepted for ${resolvedItems.length} item(s); no Razorpay keys configured`,
      engine: "system",
    });
    return Response.json({
      checkoutId: checkoutIds[0],
      orderNumber,
      mode: "simulation",
      status: "ready",
      checkoutUrl: null,
      message: "Safe simulation completed. Add Razorpay test keys to create a real test Payment Link.",
    });
  }

  const receipt = `lsa_${Date.now()}`.slice(0, 40);
  const description = resolvedItems.length === 1
    ? `LocalShop AI order: ${resolvedItems[0].product!.name}`
    : `LocalShop AI order: ${resolvedItems.length} items`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: totalAmountPaise,
      currency: "INR",
      receipt,
      notes: { merchant_id: merchant.id, localshop_session: sessionId },
    }),
  });

  const razorpayOrder = (await response.json()) as RazorpayOrder;
  if (!response.ok || !razorpayOrder.id) {
    await saveAudit({
      merchantId: merchant.id,
      sessionId,
      eventType: "checkout.failed",
      detail: razorpayOrder.error?.description ?? `Razorpay returned ${response.status}`,
      engine: "razorpay",
    });
    return Response.json(
      { error: "Razorpay test checkout could not be created. Verify the test keys and account configuration." },
      { status: 502 },
    );
  }

  await Promise.all(resolvedItems.map(({ item }) =>
    prisma.checkoutEvent.updateMany({
      where: { checkoutId: { in: checkoutIds }, productId: item.productId },
      data: { providerReference: razorpayOrder.id, status: "created" },
    }),
  ));

  await saveAudit({
    merchantId: merchant.id,
    sessionId,
    eventType: "checkout.created",
    detail: `Razorpay order ${razorpayOrder.id} created for ${resolvedItems.length} item(s)`,
    engine: "razorpay",
  });

  return Response.json({
    checkoutId: checkoutIds[0],
    orderNumber,
    mode: "razorpay",
    status: "created",
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: keyId,
    amount: totalAmountPaise,
    currency: "INR",
    checkoutUrl: null,
    message: "Razorpay order created. Complete payment to confirm your order.",
  });
}
