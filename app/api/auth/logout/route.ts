import { clearMerchantSessionCookieHeader } from "../../../../lib/merchant-auth";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearMerchantSessionCookieHeader() } });
}