import { prisma } from "./prisma";
import { sendTransactionalEmail } from "./email";
import { getRuntimeValue } from "./runtime-env";

export const CUSTOMER_SESSION_COOKIE = "lsa_customer_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OTP_TTL_MINUTES = 10;

export type Customer = {
  id: string;
  email: string;
  name: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function customerIdFor(email: string) {
  return sha256Hex(email).then((hash) => `cus_${hash.slice(0, 24)}`);
}

function generateOtp() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

async function ensureCustomerRow(email: string, id: string, name?: string) {
  return prisma.customer.upsert({
    where: { email },
    update: { lastSeenAt: new Date() },
    create: { id, email, name: name ?? null },
  });
}

async function pbkdf2Hash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function pbkdf2Verify(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHex] = stored.split(":");
  if (!saltHex || !expectedHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  const actualHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (actualHex.length !== expectedHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actualHex.length; i++) mismatch |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return mismatch === 0;
}

export async function registerCustomer(rawEmail: string, password: string, name?: string): Promise<Customer | { error: string }> {
  const email = normalizeEmail(rawEmail);
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists. Please sign in." };
  const id = await customerIdFor(email);
  const passwordHash = await pbkdf2Hash(password);
  const row = await prisma.customer.create({ data: { id, email, name: name?.trim() || null, passwordHash } });
  return { id: row.id, email: row.email, name: row.name };
}

export async function loginCustomer(rawEmail: string, password: string): Promise<Customer | null> {
  const email = normalizeEmail(rawEmail);
  const row = await prisma.customer.findUnique({ where: { email } });
  if (!row?.passwordHash) return null;
  const valid = await pbkdf2Verify(password, row.passwordHash);
  if (!valid) return null;
  await prisma.customer.update({ where: { id: row.id }, data: { lastSeenAt: new Date() } });
  return { id: row.id, email: row.email, name: row.name };
}

export async function requestCustomerOtp(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const id = await customerIdFor(email);
  await ensureCustomerRow(email, id);

  const code = generateOtp();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.customerOtp.create({ data: { email, codeHash, expiresAt } });

  const resendKey = getRuntimeValue("RESEND_API_KEY");
  if (resendKey) {
    const result = await sendTransactionalEmail({
      to: email,
      subject: `Your LocalShop AI sign-in code: ${code}`,
      text: `Your sign-in code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    });
    return { sent: result.sent, devCode: result.sent ? null : code };
  }

  return { sent: false, devCode: code };
}

export async function verifyCustomerOtp(rawEmail: string, code: string): Promise<Customer | null> {
  const email = normalizeEmail(rawEmail);
  const codeHash = await sha256Hex(code.trim());
  const now = Date.now();

  const otp = await prisma.customerOtp.findFirst({
    where: { email, codeHash, consumed: false },
    orderBy: { id: "desc" },
  });
  if (!otp || otp.expiresAt.getTime() < now) return null;

  await prisma.customerOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  const id = await customerIdFor(email);
  const row = await ensureCustomerRow(email, id, undefined);
  return { id: row.id, email: row.email, name: row.name };
}

async function hmacKey() {
  const secret = getRuntimeValue("CUSTOMER_SESSION_SECRET");
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CUSTOMER_SESSION_SECRET must be set in production. Refusing to sign sessions with a development fallback.");
  }
  const keyMaterial = secret ?? "localshop-ai-dev-session-secret";
  return crypto.subtle.importKey("raw", new TextEncoder().encode(keyMaterial), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signCustomerSession(customerId: string) {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${customerId}.${expires}`;
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { token: `${payload}.${signatureHex}`, maxAge: SESSION_TTL_SECONDS };
}

async function verifyCustomerSessionToken(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerId, expiresRaw, signatureHex] = parts;
  const expires = Number(expiresRaw);
  if (!customerId || !Number.isFinite(expires) || expires < Date.now()) return null;

  const key = await hmacKey();
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${customerId}.${expiresRaw}`));
  const expectedHex = Array.from(new Uint8Array(expectedSig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expectedHex.length !== signatureHex.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i += 1) {
    mismatch |= expectedHex.charCodeAt(i) ^ signatureHex.charCodeAt(i);
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

  const row = await prisma.customer.findUnique({ where: { id: customerId } });
  return row ? { id: row.id, email: row.email, name: row.name } : null;
}
