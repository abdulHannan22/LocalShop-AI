import { merchantSessionCookieHeader, signMerchantSession, signUpMerchant } from "../../../../lib/merchant-auth";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: { storeName?: string; slug?: string; ownerName?: string; email?: string; password?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const storeName = payload.storeName?.trim() ?? "";
  const slug = payload.slug?.trim() ?? "";
  const ownerName = payload.ownerName?.trim() ?? "";
  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";

  if (storeName.length < 2) return Response.json({ error: "Enter your store name." }, { status: 400 });
  if (slug.length < 2) return Response.json({ error: "Enter a store URL." }, { status: 400 });
  if (ownerName.length < 2) return Response.json({ error: "Enter your name." }, { status: 400 });
  if (!EMAIL_PATTERN.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  try {
    const result = await signUpMerchant({ storeName, slug, ownerName, email, password });
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });

    const { token, maxAge } = await signMerchantSession(result.userId, email, result.merchantId);
    return Response.json(
      { merchantId: result.merchantId, slug: result.slug },
      { headers: { "Set-Cookie": merchantSessionCookieHeader(token, maxAge) } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("Signup error:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    return Response.json({ 
      error: "An error occurred during sign up. Please try again.",
      ...(process.env.NODE_ENV !== "production" && { debug: errorMessage })
    }, { status: 500 });
  }
}