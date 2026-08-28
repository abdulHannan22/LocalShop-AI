import { requestPasswordReset } from "../../../../../lib/merchant-auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: { email?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const result = await requestPasswordReset(email);

  return Response.json({
    message: result.devCode
      ? "If an account exists for that email, a reset code has been sent. (Local demo mode: shown directly below since no email provider is configured.)"
      : "If an account exists for that email, a reset code has been sent.",
    devCode: result.devCode,
  });
}