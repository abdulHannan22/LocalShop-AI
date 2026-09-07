import { updateCheckoutStatusByProviderReference } from "../../../../lib/audit-store";
import { getRuntimeValue } from "../../../../lib/runtime-env";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const orderId = body.razorpay_order_id?.trim() ?? "";
  const paymentId = body.razorpay_payment_id?.trim() ?? "";
  const signature = body.razorpay_signature?.trim() ?? "";
  const secret = getRuntimeValue("RAZORPAY_KEY_SECRET");
  if (!orderId || !paymentId || !signature || !secret) {
    return Response.json({ error: "Incomplete Razorpay payment verification data." }, { status: 400 });
  }

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${orderId}|${paymentId}`));
  if (toHex(digest) !== signature.toLowerCase()) {
    return Response.json({ error: "Razorpay payment signature is invalid." }, { status: 400 });
  }

  const updated = await updateCheckoutStatusByProviderReference(orderId, "paid");
  if (!updated) return Response.json({ error: "Checkout order was not found." }, { status: 404 });
  return Response.json({ verified: true, status: "paid" });
}