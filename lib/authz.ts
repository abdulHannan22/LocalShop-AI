import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { memberships, merchants, users } from "../db/schema";
import { getRuntimeValue } from "./runtime-env";
import { ensureRuntimeSchema } from "./db-init";

export const DEMO_MERCHANT_ID = "merchant_nova";
export const DEMO_STORE_SLUG = "nova-store";

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
  owner: ["catalogue:write", "inventory:write", "orders:read", "orders:write", "insights:read", "audit:read", "staff:manage"],
  admin: ["catalogue:write", "inventory:write", "orders:read", "orders:write", "insights:read", "audit:read", "staff:manage"],
  manager: ["inventory:write", "orders:read", "orders:write", "insights:read", "audit:read"],
  sales_agent: ["orders:read"],
};

type FallbackMembership = {
  id: string;
  merchantId: string;
  userId: string | null;
  email: string;
  role: MerchantRole;
  status: string;
  invitedBy: string | null;
  createdAt: string;
};

const fallbackUsers = new Map<string, { id: string; email: string; name: string; platformRole: "platform_admin" | "user"; status: string }>();
let fallbackMemberships: FallbackMembership[] = [];
let fallbackMerchants = [
  { id: DEMO_MERCHANT_ID, name: "Nova Store", slug: DEMO_STORE_SLUG, status: "active", createdAt: "", updatedAt: "" },
];

function identityFromRequest(request: Request) {
  const emailHeader = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  let name = emailHeader ?? "Local developer";
  if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { name = decodeURIComponent(encodedName); } catch { /* use email fallback */ }
  }
  if (emailHeader) return { email: emailHeader, name };
  if (process.env.NODE_ENV !== "production") {
    const email = (getRuntimeValue("DEV_USER_EMAIL") ?? "owner@nova.local").toLowerCase();
    return { email, name: getRuntimeValue("DEV_USER_NAME") ?? "Nova Store Owner" };
  }
  return null;
}

function configuredAdmin(email: string) {
  const values = (getRuntimeValue("PLATFORM_ADMIN_EMAILS") ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return values.includes(email);
}

async function ensureDemoMerchant() {
  await ensureRuntimeSchema();
  const db = getDb();
  await db.insert(merchants).values({ id: DEMO_MERCHANT_ID, name: "Nova Store", slug: DEMO_STORE_SLUG }).onConflictDoNothing();
}

export async function resolveMerchantBySlug(slug: string) {
  try {
    await ensureDemoMerchant();
    const [merchant] = await getDb().select().from(merchants).where(and(eq(merchants.slug, slug), eq(merchants.status, "active"))).limit(1);
    return merchant ?? null;
  } catch {
    return fallbackMerchants.find((merchant) => merchant.slug === slug && merchant.status === "active") ?? null;
  }
}

export async function getActor(request: Request): Promise<Actor | null> {
  const identity = identityFromRequest(request);
  if (!identity) return null;
  const userId = `usr_${await sha256(identity.email)}`;
  try {
    await ensureDemoMerchant();
    const db = getDb();
    const [membershipCount] = await db.select({ count: sql<number>`count(*)` }).from(memberships);
    const firstUser = Number(membershipCount?.count ?? 0) === 0;
    const platformRole = configuredAdmin(identity.email) || firstUser ? "platform_admin" : "user";
    await db.insert(users).values({ id: userId, email: identity.email, name: identity.name, platformRole }).onConflictDoUpdate({
      target: users.email,
      set: { name: identity.name, lastSeenAt: new Date().toISOString(), ...(configuredAdmin(identity.email) ? { platformRole: "platform_admin" } : {}) },
    });
    let [membership] = await db.select().from(memberships).where(eq(memberships.email, identity.email)).limit(1);
    if (!membership && firstUser) {
      const membershipId = crypto.randomUUID();
      await db.insert(memberships).values({ id: membershipId, merchantId: DEMO_MERCHANT_ID, userId, email: identity.email, role: "owner", status: "active" });
      [membership] = await db.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1);
    } else if (membership && (!membership.userId || membership.status === "invited")) {
      await db.update(memberships).set({ userId, status: "active" }).where(eq(memberships.id, membership.id));
      membership = { ...membership, userId, status: "active" };
    }
    const [user] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
    const [merchant] = membership
      ? await db.select().from(merchants).where(eq(merchants.id, membership.merchantId)).limit(1)
      : [undefined];
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
  } catch {
    let user = fallbackUsers.get(identity.email);
    const firstUser = fallbackMemberships.length === 0;
    if (!user) {
      user = { id: userId, email: identity.email, name: identity.name, platformRole: configuredAdmin(identity.email) || firstUser ? "platform_admin" : "user", status: "active" };
      fallbackUsers.set(identity.email, user);
    }
    let membership = fallbackMemberships.find((item) => item.email === identity.email);
    if (!membership && firstUser) {
      membership = { id: crypto.randomUUID(), merchantId: DEMO_MERCHANT_ID, userId, email: identity.email, role: "owner", status: "active", invitedBy: null, createdAt: new Date().toISOString() };
      fallbackMemberships.push(membership);
    } else if (membership && !membership.userId) {
      membership.userId = userId;
      membership.status = "active";
    }
    return {
      userId,
      email: identity.email,
      name: identity.name,
      platformRole: user.platformRole,
      merchantId: membership?.merchantId ?? null,
      merchantName: membership ? "Nova Store" : null,
      merchantSlug: membership ? DEMO_STORE_SLUG : null,
      role: membership?.role ?? null,
    };
  }
}

export function can(actor: Actor | null, permission: Permission) {
  if (!actor) return false;
  if (permission === "platform:admin") return actor.platformRole === "platform_admin";
  return actor.role ? rolePermissions[actor.role].includes(permission) : false;
}

export async function listStaff(actor: Actor) {
  if (!actor.merchantId) return [];
  try {
    return await getDb().select().from(memberships).where(eq(memberships.merchantId, actor.merchantId)).orderBy(asc(memberships.createdAt));
  } catch {
    return fallbackMemberships.filter((item) => item.merchantId === actor.merchantId);
  }
}

export async function inviteStaff(actor: Actor, email: string, role: MerchantRole) {
  if (!actor.merchantId) return null;
  const normalized = email.trim().toLowerCase();
  try {
    const db = getDb();
    const id = crypto.randomUUID();
    await db.insert(memberships).values({ id, merchantId: actor.merchantId, email: normalized, role, status: "invited", invitedBy: actor.userId }).onConflictDoUpdate({
      target: [memberships.merchantId, memberships.email],
      set: { role, status: "invited", invitedBy: actor.userId },
    });
    const [row] = await db.select().from(memberships).where(and(eq(memberships.merchantId, actor.merchantId), eq(memberships.email, normalized))).limit(1);
    return row ?? null;
  } catch {
    let row = fallbackMemberships.find((item) => item.merchantId === actor.merchantId && item.email === normalized);
    if (row) {
      row = { ...row, role, status: "invited", invitedBy: actor.userId };
      fallbackMemberships = fallbackMemberships.map((item) => item.id === row?.id ? row : item);
      return row;
    }
    row = { id: crypto.randomUUID(), merchantId: actor.merchantId, userId: null, email: normalized, role, status: "invited", invitedBy: actor.userId, createdAt: new Date().toISOString() };
    fallbackMemberships.push(row);
    return row;
  }
}

export async function updateStaffMembership(
  actor: Actor,
  membershipId: string,
  role: Exclude<MerchantRole, "owner">,
  status: "active" | "suspended" | "invited",
) {
  if (!actor.merchantId) return null;
  try {
    const [existing] = await getDb()
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.merchantId, actor.merchantId)))
      .limit(1);
    if (!existing || existing.role === "owner") return null;
    const [row] = await getDb()
      .update(memberships)
      .set({ role, status })
      .where(and(eq(memberships.id, membershipId), eq(memberships.merchantId, actor.merchantId)))
      .returning();
    return row ?? null;
  } catch {
    const index = fallbackMemberships.findIndex(
      (item) => item.id === membershipId && item.merchantId === actor.merchantId && item.role !== "owner",
    );
    if (index < 0) return null;
    fallbackMemberships[index] = { ...fallbackMemberships[index], role, status };
    return fallbackMemberships[index];
  }
}

export async function createMerchant(name: string, slug: string, ownerEmail: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedEmail = ownerEmail.trim().toLowerCase();
  const id = `merchant_${await sha256(normalizedSlug)}`;
  try {
    await ensureRuntimeSchema();
    const db = getDb();
    await db.insert(merchants).values({ id, name: name.trim(), slug: normalizedSlug });
    await db.insert(memberships).values({
      id: crypto.randomUUID(),
      merchantId: id,
      email: normalizedEmail,
      role: "owner",
      status: "invited",
    });
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
    return merchant ?? null;
  } catch {
    if (fallbackMerchants.some((merchant) => merchant.slug === normalizedSlug)) return null;
    const merchant = { id, name: name.trim(), slug: normalizedSlug, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fallbackMerchants.push(merchant);
    fallbackMemberships.push({ id: crypto.randomUUID(), merchantId: id, userId: null, email: normalizedEmail, role: "owner", status: "invited", invitedBy: null, createdAt: new Date().toISOString() });
    return merchant;
  }
}

export async function listAllMerchants() {
  try {
    await ensureDemoMerchant();
    const db = getDb();
    const merchantRows = await db.select().from(merchants).orderBy(asc(merchants.createdAt));
    return Promise.all(merchantRows.map(async (merchant) => {
      const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(memberships).where(eq(memberships.merchantId, merchant.id));
      return { ...merchant, memberCount: Number(memberCount?.count ?? 0) };
    }));
  } catch {
    return fallbackMerchants.map((merchant) => ({
      ...merchant,
      memberCount: fallbackMemberships.filter((membership) => membership.merchantId === merchant.id).length,
    }));
  }
}

export async function updateMerchantStatus(id: string, status: "active" | "suspended") {
  try {
    const [row] = await getDb().update(merchants).set({ status, updatedAt: new Date().toISOString() }).where(eq(merchants.id, id)).returning();
    return row ?? null;
  } catch {
    const index = fallbackMerchants.findIndex((merchant) => merchant.id === id);
    if (index < 0) return null;
    fallbackMerchants[index] = { ...fallbackMerchants[index], status, updatedAt: new Date().toISOString() };
    return fallbackMerchants[index];
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
