import { resetMerchantPassword } from "../../../../../lib/merchant-auth";

export async function POST(request: Request) {
  let payload: { email?: string; code?: string; newPassword?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  const code = payload.code?.trim() ?? "";
  const newPassword = payload.newPassword ?? "";
  if (!email || !/^\d{6}$/.test(code)) {
    return Response.json({ error: "Enter the 6-digit code sent to your email." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const result = await resetMerchantPassword(email, code, newPassword);
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });

  return Response.json({ ok: true });
}