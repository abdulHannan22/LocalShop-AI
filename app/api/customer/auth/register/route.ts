import { registerCustomer, signCustomerSession, customerSessionCookieHeader } from "../../../../../lib/customer-auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    let payload: { email?: string; password?: string; name?: string };
    try {
      payload = (await request.json()) as typeof payload;
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const email = payload.email?.trim() ?? "";
    const password = payload.password ?? "";
    if (!EMAIL_PATTERN.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const result = await registerCustomer(email, password, payload.name);
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });

    const { token, maxAge } = await signCustomerSession(result.id);
    return Response.json(
      { customer: result },
      { headers: { "Set-Cookie": customerSessionCookieHeader(token, maxAge) } },
    );
  } catch (err) {
    console.error("register error", err);
    const detail = err instanceof Error ? err.message : "Unknown registration error";
    return Response.json({ error: process.env.NODE_ENV === "production" ? "Registration failed. Please try again." : `Registration failed: ${detail}` }, { status: 500 });
  }
}
