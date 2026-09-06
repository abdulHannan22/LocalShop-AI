import { getRuntimeValue } from "../../../lib/runtime-env";
import { getActor } from "../../../lib/authz";

export async function GET(request: Request) {
  const actor = await getActor(request);
  return Response.json({
    actor,
    integrations: {
      gemini: Boolean(getRuntimeValue("GEMINI_API_KEY")),
      razorpay: Boolean(getRuntimeValue("RAZORPAY_KEY_ID") && getRuntimeValue("RAZORPAY_KEY_SECRET")),
      webhook: Boolean(getRuntimeValue("RAZORPAY_WEBHOOK_SECRET")),
    },
    storage: "Prisma Postgres (Neon)",
  });
}
