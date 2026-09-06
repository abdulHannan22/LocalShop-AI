import { prisma } from "./prisma";
import { sendTransactionalEmail } from "./email";
import { getRuntimeValue } from "./runtime-env";

export const MERCHANT_SESSION_COOKIE = "lsa_merchant_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 100_000;
const RESET_TTL_MINUTES = 15;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${PBKDF2_ITERATIONS}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltHex, iterationsRaw, hashHex] = stored.split(":");
  if (!saltHex || !iterationsRaw || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)?.map((b) => parseInt(b, 16)) ?? []);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: Number(iterationsRaw), hash: "SHA-256" },
    key,
    256,
  );
  const computedHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (computedHex.length !== hashHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computedHex.length; i += 1) {
    mismatch |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return mismatch === 0;
}

async function userIdFor(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `usr_${hex.slice(0, 24)}`;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateResetCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

export async function requestPasswordReset(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return { sent: false as const, devCode: null as string | null };

  const code = generateResetCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.merchantPasswordReset.create({ data: { email, codeHash, expiresAt } });

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

  const reset = await prisma.merchantPasswordReset.findFirst({
    where: { email, codeHash, consumed: false },
    orderBy: { id: "desc" },
  });
  if (!reset || reset.expiresAt.getTime() < now) {
    return { error: "That code is invalid or has expired." } as const;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.merchantPasswordReset.update({ where: { id: reset.id }, data: { consumed: true } }),
    prisma.user.update({ where: { email }, data: { passwordHash } }),
  ]);
  return { ok: true } as const;
}

export async function signUpMerchant(input: { storeName: string; slug: string; ownerName: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return { error: "Enter a valid store URL slug." } as const;
  if (input.password.length < 8) return { error: "Password must be at least 8 characters." } as const;

  const passwordHash = await hashPassword(input.password);
  const userId = await userIdFor(email);
  const merchantId = `merchant_${slug.replace(/-/g, "_")}_${crypto.randomUUID().slice(0, 8)}`;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser?.passwordHash) {
    return { error: "An account with this email already exists. Try signing in instead." } as const;
  }
  const existingSlug = await prisma.merchant.findUnique({ where: { slug } });
  if (existingSlug) return { error: "That store URL is already taken." } as const;

  await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    await tx.user.upsert({
      where: { email },
      update: { passwordHash, name: input.ownerName.trim() },
      create: { id: userId, email, name: input.ownerName.trim(), passwordHash },
    });
    await tx.merchant.create({ data: { id: merchantId, name: input.storeName.trim(), slug } });
    await tx.membership.create({
      data: { id: crypto.randomUUID(), merchantId, userId, email, role: "owner", status: "active" },
    });
  });

  return { userId, merchantId, slug } as const;
}

export async function signInMerchant(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? { userId: user.id, email: user.email, name: user.name ?? email } : null;
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
  const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const expectedHex = Array.from(new Uint8Array(expectedSig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expectedHex.length !== signatureHex.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i += 1) {
    mismatch |= expectedHex.charCodeAt(i) ^ signatureHex.charCodeAt(i);
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

export async function resolveMerchantSessionIdentity(request: Request): Promise<{ email: string; name: string } | null> {
  const token = readCookie(request, MERCHANT_SESSION_COOKIE);
  if (!token) return null;
  const userId = await verifyMerchantSessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? { email: user.email, name: user.name ?? user.email } : null;
}
