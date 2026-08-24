import { getRuntimeValue } from "./runtime-env";

/**
 * Sends a transactional email via Resend when RESEND_API_KEY is configured.
 * Without it, this is a safe no-op — callers should still write an audit
 * event so the attempt is visible in the merchant's audit trail, mirroring
 * how the rest of the app degrades gracefully without paid credentials.
 */
export async function sendTransactionalEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = getRuntimeValue("RESEND_API_KEY");
  if (!apiKey) return { sent: false as const, reason: "no_provider_configured" };

  const from = getRuntimeValue("TRANSACTIONAL_EMAIL_FROM") ?? "LocalShop AI <onboarding@resend.dev>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
    });
    return response.ok ? { sent: true as const } : { sent: false as const, reason: `provider_error_${response.status}` };
  } catch {
    return { sent: false as const, reason: "network_error" };
  }
}
