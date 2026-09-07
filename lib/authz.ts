import { prisma } from "./prisma";
import { getRuntimeValue } from "./runtime-env";
import { resolveMerchantSessionIdentity } from "./merchant-auth";

export const DEMO_MERCHANT_ID = "merchant_nova";
export const DEMO_STORE_SLUG = "nova-clothing";

export const DEMO_MERCHANTS = [
  { id: "merchant_nova",    name: "Nova Clothing",      slug: "nova-clothing" },
  { id: "merchant_spark",   name: "Spark Accessories",  slug: "spark-accessories" },
  { id: "merchant_zenith",  name: "Zenith Books",       slug: "zenith-books" },
  { id: "merchant_pixel",   name: "Pixel Home Decor",   slug: "pixel-home-decor" },
  { id: "merchant_orbit",   name: "Orbit Sports",       slug: "orbit-sports" },
] as const;

export type MerchantRole = "owner" | "admin" | "manager" | "sales_agent";
export type Permission =
  | "catalogue:write"
  | "inventory:write"
  | "orders:read"
  | "orders:write"
  | "insights:read"
  | "audit:read"
  | "staff:manage"
  | "platform:admin";

export type Actor = {
  userId: string;
  email: string;
  name: string;
  platformRole: "platform_admin" | "user";
  merchantId: string | null;
  merchantName: string | null;
  merchantSlug: string | null;
  role: MerchantRole | null;
};

const rolePermissions: Record<MerchantRole, Permission[]> = {
  owner:       ["catalogue:write", "inventory:write", "orders:read", "orders:write", "insights:read", "audit:read", "staff:manage"],
  admin:       ["catalogue:write", "inventory:write", "orders:read", "orders:write", "insights:read", "audit:read", "staff:manage"],
  manager:     ["inventory:write", "orders:read", "orders:write", "insights:read", "audit:read"],
  sales_agent: ["orders:read"],
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

async function identityFromRequest(request: Request) {
  const sessionIdentity = await resolveMerchantSessionIdentity(request);
  if (sessionIdentity) return sessionIdentity;

  const emailHeader = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  let name = emailHeader ?? "Local developer";
  if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { name = decodeURIComponent(encodedName); } catch { /* use email fallback */ }
  }
  if (emailHeader) return { email: emailHeader, name };
  if (process.env.NODE_ENV !== "production" && getRuntimeValue("DEV_AUTOLOGIN") === "true") {
    const email = (getRuntimeValue("DEV_USER_EMAIL") ?? "owner@nova.local").toLowerCase();
    return { email, name: getRuntimeValue("DEV_USER_NAME") ?? "Nova Store Owner" };
  }
  return null;
}

function configuredAdmin(email: string) {
  return (getRuntimeValue("PLATFORM_ADMIN_EMAILS") ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    .includes(email);
}

async function ensureDemoMerchant() {
  await Promise.all(
    DEMO_MERCHANTS.map((m) =>
      prisma.merchant.upsert({ where: { id: m.id }, update: { name: m.name, slug: m.slug }, create: m }),
    ),
  );
}

export async function resolveMerchantBySlug(slug: string) {
  await ensureDemoMerchant();
  return prisma.merchant.findFirst({ where: { slug, status: "active" } });
}

export async function getActor(request: Request): Promise<Actor | null> {
  const identity = await identityFromRequest(request);
  if (!identity) return null;
  const userId = `usr_${await sha256(identity.email)}`;

  await ensureDemoMerchant();
  const memberCount = await prisma.membership.count();
  const firstUser = memberCount === 0;
  const platformRole = configuredAdmin(identity.email) || firstUser ? "platform_admin" : "user";

  await prisma.user.upsert({
    where: { email: identity.email },
    update: { name: identity.name, lastSeenAt: new Date(), ...(configuredAdmin(identity.email) ? { platformRole: "platform_admin" } : {}) },
    create: { id: userId, email: identity.email, name: identity.name, platformRole },
  });

  const membership = await prisma.membership.findFirst({ where: { email: identity.email } });
  const user = await prisma.user.findUnique({ where: { email: identity.email } });
  const merchant = membership ? await prisma.merchant.findUnique({ where: { id: membership.merchantId } }) : null;

  return {
    userId,
    email: identity.email,
    name: identity.name,
    platformRole: user?.platformRole === "platform_admin" ? "platform_admin" : "user",
    merchantId: membership?.merchantId ?? null,
    merchantName: merchant?.name ?? null,
    merchantSlug: merchant?.slug ?? null,
    role: (membership?.role as MerchantRole | undefined) ?? null,
  };
}

export function can(actor: Actor | null, permission: Permission) {
  if (!actor) return false;
  if (permission === "platform:admin") return actor.platformRole === "platform_admin";
  return actor.role ? rolePermissions[actor.role].includes(permission) : false;
}

export async function listStaff(actor: Actor) {
  if (!actor.merchantId) return [];
  return prisma.membership.findMany({ where: { merchantId: actor.merchantId }, orderBy: { createdAt: "asc" } });
}

export async function inviteStaff(actor: Actor, email: string, role: MerchantRole) {
  if (!actor.merchantId) return null;
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.membership.findUnique({ where: { email: normalized } });
  if (existing && existing.merchantId !== actor.merchantId) return null;
  return prisma.membership.upsert({
    where: { email: normalized },
    update: { role, status: "invited", invitedBy: actor.userId },
    create: { id: crypto.randomUUID(), merchantId: actor.merchantId, email: normalized, role, status: "invited", invitedBy: actor.userId },
  });
}

export async function updateStaffMembership(
  actor: Actor,
  membershipId: string,
  role: Exclude<MerchantRole, "owner">,
  status: "active" | "suspended" | "invited",
) {
  if (!actor.merchantId) return null;
  const existing = await prisma.membership.findFirst({ where: { id: membershipId, merchantId: actor.merchantId } });
  if (!existing || existing.role === "owner") return null;
  return prisma.membership.update({ where: { id: membershipId }, data: { role, status } });
}

export async function createMerchant(name: string, slug: string, ownerEmail: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedEmail = ownerEmail.trim().toLowerCase();
  const id = `merchant_${await sha256(normalizedSlug)}`;
  await prisma.merchant.create({ data: { id, name: name.trim(), slug: normalizedSlug } });
  await prisma.membership.create({
    data: { id: crypto.randomUUID(), merchantId: id, email: normalizedEmail, role: "owner", status: "invited" },
  });
  return prisma.merchant.findUnique({ where: { id } });
}

export async function listAllMerchants() {
  await ensureDemoMerchant();
  const merchants = await prisma.merchant.findMany({ orderBy: { createdAt: "asc" } });
  type MerchantRow = (typeof merchants)[number];
  return Promise.all(merchants.map(async (m: MerchantRow) => ({
    ...m,
    memberCount: await prisma.membership.count({ where: { merchantId: m.id } }),
  })));
}

export async function updateMerchantStatus(id: string, status: "active" | "suspended") {
  return prisma.merchant.update({ where: { id }, data: { status } });
}
