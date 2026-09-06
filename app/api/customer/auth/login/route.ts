import { loginCustomer, signCustomerSession, customerSessionCookieHeader } from "../../../../../lib/customer-auth";

export async function POST(request: Request) {
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
    console.error("login error", err);
    return Response.json({ error: "Sign in failed. Please try again." }, { status: 500 });
  }
}
