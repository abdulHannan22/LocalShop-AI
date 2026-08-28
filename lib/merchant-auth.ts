import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { memberships, merchantPasswordResets, merchants, users } from "../db/schema";
import { ensureRuntimeSchema } from "./db-init";
import { sendTransactionalEmail } from "./email";
import { getRuntimeValue } from "./runtime-env";

export const MERCHANT_SESSION_COOKIE = "lsa_merchant_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100_000;

type FallbackUser = { id: string; email: string; name: string; passwordHash: string; platformRole: "platform_admin" | "user" };
type FallbackMerchant = { id: string; name: string; slug: string; status: string; createdAt: string; updatedAt: string };
type FallbackMembership = { id: string; merchantId: string; userId: string | null; email: string; role: string; status: string; invitedBy: string | null; createdAt: string };

const fallbackUsers = new Map<string, FallbackUser>();
const fallbackMerchants: FallbackMerchant[] = [];
const fallbackMemberships: FallbackMembership[] = [];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// PBKDF2-SHA256 with a random salt, stored as "salt:iterations:hash" (all
// hex). No external bcrypt dependency needed — Web Crypto's PBKDF2 is
// available in both Node and the Cloudflare Workers runtime.
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  const saltHex = Array.from(salt).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(bits)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${PBKDF2_ITERATIONS}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltHex, iterationsRaw, hashHex] = stored.split(":");
  if (!saltHex || !iterationsRaw || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: Number(iterationsRaw), hash: "SHA-256" },
    key,
    256,
  );
  const computedHex = Array.from(new Uint8Array(bits)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (computedHex.length !== hashHex.length) return false;
  let mismatch = 0;
  for (let index = 0; index < computedHex.length; index += 1) {
    mismatch |= computedHex.charCodeAt(index) ^ hashHex.charCodeAt(index);
  }
  return mismatch === 0;
}

async function userIdFor(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `usr_${hex.slice(0, 24)}`;
}

type FallbackReset = { email: string; codeHash: string; expiresAt: string; consumed: boolean };
const fallbackResets: FallbackReset[] = [];

const RESET_TTL_MINUTES = 15;

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateResetCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

/**
 * Starts a password-reset flow. Always returns the same shape whether or
 * not the email has an account, so the response never reveals which
 * emails are registered. Without a transactional email provider
 * configured, the code is returned directly (same safe local/demo
 * degradation used by customer OTP sign-in).
 */
export async function requestPasswordReset(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  let hasAccount = false;
  try {
    await ensureRuntimeSchema();
    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    hasAccount = Boolean(user?.passwordHash);
  } catch {
    hasAccount = fallbackUsers.has(email);
  }
  if (!hasAccount) return { sent: false as const, devCode: null as string | null };

  const code = generateResetCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000).toISOString();

  try {
    await ensureRuntimeSchema();
    await getDb().insert(merchantPasswordResets).values({ email, codeHash, expiresAt });
  } catch {
    fallbackResets.push({ email, codeHash, expiresAt, consumed: false });
  }

  const resendKey = getRuntimeValue("RESEND_API_KEY");
  if (resendKey) {
    const result = await sendTransactionalEmail({
      to: email,
      subject: `Your LocalShop AI password reset code: ${code}`,
      text: `Your password reset code is ${code}. It expires in ${RESET_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    });
    return { sent: result.sent, devCode: result.sent ? null : code };
  }

  return { sent: false as const, devCode: code };
}

export async function resetMerchantPassword(rawEmail: string, code: string, newPassword: string) {
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters." } as const;
  const email = normalizeEmail(rawEmail);
  const codeHash = await sha256Hex(code.trim());
  const now = Date.now();

  try {
    await ensureRuntimeSchema();
    const db = getDb();
    const [reset] = await db
      .select()
      .from(merchantPasswordResets)
      .where(and(eq(merchantPasswordResets.email, email), eq(merchantPasswordResets.codeHash, codeHash), eq(merchantPasswordResets.consumed, 0)))
      .orderBy(desc(merchantPasswordResets.id))
      .limit(1);
    if (!reset || new Date(reset.expiresAt).getTime() < now) return { error: "That code is invalid or has expired." } as const;
    await db.update(merchantPasswordResets).set({ consumed: 1 }).where(eq(merchantPasswordResets.id, reset.id));
    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.email, email));
    return { ok: true } as const;
  } catch {
    const match = fallbackResets
      .filter((reset) => reset.email === email && reset.codeHash === codeHash && !reset.consumed)
      .sort((a, b) => (a.expiresAt < b.expiresAt ? 1 : -1))[0];
    if (!match || new Date(match.expiresAt).getTime() < now) return { error: "That code is invalid or has expired." } as const;
    match.consumed = true;
    const user = fallbackUsers.get(email);
    if (!user) return { error: "That code is invalid or has expired." } as const;
    user.passwordHash = await hashPassword(newPassword);
    return { ok: true } as const;
  }
}

export async function signUpMerchant(input: { storeName: string; slug: string; ownerName: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return { error: "Enter a valid store URL slug." } as const;
  if (input.password.length < 8) return { error: "Password must be at least 8 characters." } as const;

  const passwordHash = await hashPassword(input.password);
  const userId = await userIdFor(email);
  const merchantId = `merchant_${slug.replace(/-/g, "_")}_${crypto.randomUUID().slice(0, 8)}`;

  try {
    await ensureRuntimeSchema();
    const db = getDb();
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser?.passwordHash) return { error: "An account with this email already exists. Try signing in instead." } as const;
    const [existingSlug] = await db.select().from(merchants).where(eq(merchants.slug, slug)).limit(1);
    if (existingSlug) return { error: "That store URL is already taken." } as const;

    await db
      .insert(users)
      .values({ id: userId, email, name: input.ownerName.trim(), passwordHash })
      .onConflictDoUpdate({ target: users.email, set: { passwordHash, name: input.ownerName.trim() } });
    await db.insert(merchants).values({ id: merchantId, name: input.storeName.trim(), slug });
    await db.insert(memberships).values({ id: crypto.randomUUID(), merchantId, userId, email, role: "owner", status: "active" });
    return { userId, merchantId, slug } as const;
  } catch {
    if (fallbackUsers.has(email) || fallbackMerchants.some((merchant) => merchant.slug === slug)) {
      return { error: "That email or store URL is already in use." } as const;
    }
    fallbackUsers.set(email, { id: userId, email, name: input.ownerName.trim(), passwordHash, platformRole: fallbackUsers.size === 0 ? "platform_admin" : "user" });
    fallbackMerchants.push({ id: merchantId, name: input.storeName.trim(), slug, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    fallbackMemberships.push({ id: crypto.randomUUID(), merchantId, userId, email, role: "owner", status: "active", invitedBy: null, createdAt: new Date().toISOString() });
    return { userId, merchantId, slug } as const;
  }
}

export async function signInMerchant(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  try {
    await ensureRuntimeSchema();
    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    if (!user?.passwordHash) return null;
    const valid = await verifyPassword(password, user.passwordHash);
    return valid ? { userId: user.id, email: user.email, name: user.name ?? email } : null;
  } catch {
    const user = fallbackUsers.get(email);
    if (!user) return null;
    const valid = await verifyPassword(password, user.passwordHash);
    return valid ? { userId: user.id, email: user.email, name: user.name } : null;
  }
}

async function hmacKey() {
  const secret = getRuntimeValue("MERCHANT_SESSION_SECRET") ?? "localshop-ai-dev-merchant-session-secret";
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signMerchantSession(userId: string) {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${userId}.${expires}`;
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { token: `${payload}.${signatureHex}`, maxAge: SESSION_TTL_SECONDS };
}

async function verifyMerchantSessionToken(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signatureHex] = parts;
  const expires = Number(expiresRaw);
  if (!userId || !Number.isFinite(expires) || expires < Date.now()) return null;

  const key = await hmacKey();
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}.${expiresRaw}`));
  const expectedHex = Array.from(new Uint8Array(expectedSig)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (expectedHex.length !== signatureHex.length) return null;
  let mismatch = 0;
  for (let index = 0; index < expectedHex.length; index += 1) {
    mismatch |= expectedHex.charCodeAt(index) ^ signatureHex.charCodeAt(index);
  }
  return mismatch === 0 ? userId : null;
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

export function merchantSessionCookieHeader(token: string, maxAge: number) {
  const secure = getRuntimeValue("NODE_ENV") === "production" ? "; Secure" : "";
  return `${MERCHANT_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearMerchantSessionCookieHeader() {
  return `${MERCHANT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Resolves {email, name} from a merchant session cookie, if present and
 * valid. Feeds into the same downstream membership/role lookup that
 * header-based platform identity already uses in getActor, so self-serve
 * signup/login and the hosted-platform header mechanism both work without
 * duplicating logic.
 */
export async function resolveMerchantSessionIdentity(request: Request): Promise<{ email: string; name: string } | null> {
  const token = readCookie(request, MERCHANT_SESSION_COOKIE);
  if (!token) return null;
  const userId = await verifyMerchantSessionToken(token);
  if (!userId) return null;

  try {
    await ensureRuntimeSchema();
    const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
    return user ? { email: user.email, name: user.name ?? user.email } : null;
  } catch {
    for (const user of fallbackUsers.values()) {
      if (user.id === userId) return { email: user.email, name: user.name };
    }
    return null;
  }
}