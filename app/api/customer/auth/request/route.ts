import { requestCustomerOtp } from "../../../../../lib/customer-auth";

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

  const result = await requestCustomerOtp(email);

  return Response.json({
    message: result.sent
      ? "We sent a 6-digit code to your email."
      : "Local demo mode: no email provider configured, so here is your code directly.",
    // Only present when no transactional email provider (RESEND_API_KEY) is
    // configured — mirrors the app's existing "safe simulation" behaviour
    // for Razorpay when live credentials are absent.
    devCode: result.devCode,
  });
}
