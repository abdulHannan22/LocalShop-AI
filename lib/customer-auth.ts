import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { customerOtps, customers } from "../db/schema";
import { ensureRuntimeSchema } from "./db-init";
import { getRuntimeValue } from "./runtime-env";

export const CUSTOMER_SESSION_COOKIE = "lsa_customer_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const OTP_TTL_MINUTES = 10;

export type Customer = {
  id: string;
  email: string;
  name: string | null;
};

type FallbackCustomer = Customer & { status: string; createdAt: string; lastSeenAt: string };
type FallbackOtp = { email: string; codeHash: string; expiresAt: string; consumed: boolean };

const fallbackCustomers = new Map<string, FallbackCustomer>();
const fallbackOtps: FallbackOtp[] = [];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function customerIdFor(email: string) {
  // Deterministic id keeps repeated sign-ins idempotent without a lookup.
  return sha256Hex(email).then((hash) => `cus_${hash.slice(0, 24)}`);
}

function generateOtp() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

async function ensureCustomerRow(email: string, id: string) {
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    await db
      .insert(customers)
      .values({ id, email })
      .onConflictDoUpdate({ target: customers.email, set: { lastSeenAt: new Date().toISOString() } });
    const [row] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
    return row ?? null;
  } catch {
    const existing = fallbackCustomers.get(email);
    if (existing) {
      existing.lastSeenAt = new Date().toISOString();
      return existing;
    }
    const created: FallbackCustomer = { id, email, name: null, status: "active", createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() };
    fallbackCustomers.set(email, created);
    return created;
  }
}

/**
 * Starts the sign-in flow: creates the customer record if needed and stores
 * a hashed OTP. If no email provider is configured, the raw code is returned
 * so the demo/local flow keeps working without paid credentials, mirroring
 * how the Razorpay and Gemini integrations degrade gracefully.
 */
export async function requestCustomerOtp(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const id = await customerIdFor(email);
  await ensureCustomerRow(email, id);

  const code = generateOtp();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  try {
    await ensureRuntimeSchema();
    await getDb().insert(customerOtps).values({ email, codeHash, expiresAt });
  } catch {
    fallbackOtps.push({ email, codeHash, expiresAt, consumed: false });
  }

  const resendKey = getRuntimeValue("RESEND_API_KEY");
  const fromAddress = getRuntimeValue("TRANSACTIONAL_EMAIL_FROM") ?? "LocalShop AI <onboarding@resend.dev>";
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject: `Your LocalShop AI sign-in code: ${code}`,
        text: `Your sign-in code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      }),
    }).catch(() => null);
    return { sent: true, devCode: null as string | null };
  }

  // No email provider configured: safe local/demo mode.
  return { sent: false, devCode: code };
}

export async function verifyCustomerOtp(rawEmail: string, code: string): Promise<Customer | null> {
  const email = normalizeEmail(rawEmail);
  const codeHash = await sha256Hex(code.trim());
  const now = Date.now();

  try {
    await ensureRuntimeSchema();
    const db = getDb();
    const [otp] = await db
      .select()
      .from(customerOtps)
      .where(and(eq(customerOtps.email, email), eq(customerOtps.codeHash, codeHash), eq(customerOtps.consumed, 0)))
      .orderBy(desc(customerOtps.id))
      .limit(1);
    if (!otp || new Date(otp.expiresAt).getTime() < now) return null;
    await db.update(customerOtps).set({ consumed: 1 }).where(eq(customerOtps.id, otp.id));
    const id = await customerIdFor(email);
    const row = await ensureCustomerRow(email, id);
    return row ? { id: row.id, email: row.email, name: row.name } : null;
  } catch {
    const match = fallbackOtps
      .filter((otp) => otp.email === email && otp.codeHash === codeHash && !otp.consumed)
      .sort((a, b) => (a.expiresAt < b.expiresAt ? 1 : -1))[0];
    if (!match || new Date(match.expiresAt).getTime() < now) return null;
    match.consumed = true;
    const id = await customerIdFor(email);
    const row = await ensureCustomerRow(email, id);
    return row ? { id: row.id, email: row.email, name: row.name } : null;
  }
}

async function hmacKey() {
  const secret = getRuntimeValue("CUSTOMER_SESSION_SECRET") ?? "localshop-ai-dev-session-secret";
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signCustomerSession(customerId: string) {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${customerId}.${expires}`;
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const token = `${payload}.${signatureHex}`;
  return { token, maxAge: SESSION_TTL_SECONDS };
}

async function verifyCustomerSessionToken(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerId, expiresRaw, signatureHex] = parts;
  const expires = Number(expiresRaw);
  if (!customerId || !Number.isFinite(expires) || expires < Date.now()) return null;

  const key = await hmacKey();
  const payload = `${customerId}.${expiresRaw}`;
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(expectedSig)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (expectedHex.length !== signatureHex.length) return null;
  let mismatch = 0;
  for (let index = 0; index < expectedHex.length; index += 1) {
    mismatch |= expectedHex.charCodeAt(index) ^ signatureHex.charCodeAt(index);
  }
  return mismatch === 0 ? customerId : null;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function customerSessionCookieHeader(token: string, maxAge: number) {
  const secure = getRuntimeValue("NODE_ENV") === "production" ? "; Secure" : "";
  return `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCustomerSessionCookieHeader() {
  return `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function resolveCustomer(request: Request): Promise<Customer | null> {
  const token = readCookie(request, CUSTOMER_SESSION_COOKIE);
  if (!token) return null;
  const customerId = await verifyCustomerSessionToken(token);
  if (!customerId) return null;

  try {
    await ensureRuntimeSchema();
    const [row] = await getDb().select().from(customers).where(eq(customers.id, customerId)).limit(1);
    return row ? { id: row.id, email: row.email, name: row.name } : null;
  } catch {
    for (const customer of fallbackCustomers.values()) {
      if (customer.id === customerId) return { id: customer.id, email: customer.email, name: customer.name };
    }
    return null;
  }
}
