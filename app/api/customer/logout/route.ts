import { clearCustomerSessionCookieHeader } from "../../../../lib/customer-auth";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCustomerSessionCookieHeader() } });
}
