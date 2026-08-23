import { can, createMerchant, getActor, listAllMerchants, updateMerchantStatus } from "../../../../lib/authz";
import { saveAudit } from "../../../../lib/audit-store";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "platform:admin")) return Response.json({ error: "Platform administrator access is required." }, { status: actor ? 403 : 401 });
  return Response.json({ merchants: await listAllMerchants() });
}

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "platform:admin")) return Response.json({ error: "Platform administrator access is required." }, { status: actor ? 403 : 401 });
  const body = (await request.json()) as { name?: string; slug?: string; ownerEmail?: string };
  const name = body.name?.trim() ?? "";
  const slug = body.slug?.trim().toLowerCase() ?? "";
  const ownerEmail = body.ownerEmail?.trim().toLowerCase() ?? "";
  if (name.length < 2 || name.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    return Response.json({ error: "Name, kebab-case store slug and valid owner email are required." }, { status: 400 });
  }
  const merchant = await createMerchant(name, slug, ownerEmail);
  if (!merchant) return Response.json({ error: "The store slug is already in use or the merchant could not be created." }, { status: 409 });
  await saveAudit({ merchantId: merchant.id, sessionId: `merchant_${merchant.id}`, eventType: "merchant.created", detail: `${name} created with ${ownerEmail} as invited owner`, engine: "system" });
  return Response.json({ merchant }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "platform:admin")) return Response.json({ error: "Platform administrator access is required." }, { status: actor ? 403 : 401 });
  const body = (await request.json()) as { merchantId?: string; status?: "active" | "suspended" };
  if (!body.merchantId || !body.status || !["active", "suspended"].includes(body.status)) {
    return Response.json({ error: "Merchant and status are required." }, { status: 400 });
  }
  const merchant = await updateMerchantStatus(body.merchantId, body.status);
  if (!merchant) return Response.json({ error: "Merchant not found." }, { status: 404 });
  await saveAudit({ merchantId: body.merchantId, sessionId: `merchant_${body.merchantId}`, eventType: "merchant.status_changed", detail: `Merchant status changed to ${body.status}`, engine: "system" });
  return Response.json({ merchant });
}
