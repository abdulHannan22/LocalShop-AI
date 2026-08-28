import { merchantSessionCookieHeader, signInMerchant, signMerchantSession } from "../../../../lib/merchant-auth";

export async function POST(request: Request) {
  let payload: { email?: string; password?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const identity = await signInMerchant(email, password);
  if (!identity) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const { token, maxAge } = await signMerchantSession(identity.userId);
  return Response.json(
    { email: identity.email },
    { headers: { "Set-Cookie": merchantSessionCookieHeader(token, maxAge) } },
  );
}