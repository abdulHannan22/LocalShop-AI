import { customerSessionCookieHeader, signCustomerSession, verifyCustomerOtp } from "../../../../../lib/customer-auth";

export async function POST(request: Request) {
  let payload: { email?: string; code?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  const code = payload.code?.trim() ?? "";
  if (!email || !/^\d{6}$/.test(code)) {
    return Response.json({ error: "Enter the 6-digit code sent to your email." }, { status: 400 });
  }

  const customer = await verifyCustomerOtp(email, code);
  if (!customer) {
    return Response.json({ error: "That code is invalid or has expired." }, { status: 401 });
  }

  const { token, maxAge } = await signCustomerSession(customer.id);
  return Response.json(
    { customer },
    { headers: { "Set-Cookie": customerSessionCookieHeader(token, maxAge) } },
  );
}
