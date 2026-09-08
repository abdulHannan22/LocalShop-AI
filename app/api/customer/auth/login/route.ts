import { loginCustomer, signCustomerSession, customerSessionCookieHeader } from "../../../../../lib/customer-auth";
import { checkRateLimit, clientIp, rateLimitResponse } from "../../../../../lib/rate-limit";
import { errorResponse } from "../../../../../lib/api-errors";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientIp(request), "login");
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  try {
    let payload: { email?: string; password?: string };
    try {
      payload = (await request.json()) as typeof payload;
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const email = payload.email?.trim() ?? "";
    const password = payload.password ?? "";
    if (!email || !password) return Response.json({ error: "Email and password are required." }, { status: 400 });

    const customer = await loginCustomer(email, password);
    if (!customer) return Response.json({ error: "Invalid email or password." }, { status: 401 });

    const { token, maxAge } = await signCustomerSession(customer.id);
    return Response.json(
      { customer },
      { headers: { "Set-Cookie": customerSessionCookieHeader(token, maxAge) } },
    );
  } catch (err) {
    return errorResponse(err, "customer-login", "Sign in failed. Please try again in a few moments.");
  }
}
