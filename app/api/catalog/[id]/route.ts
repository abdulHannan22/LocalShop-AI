import { changeInventory, updateProduct } from "../../../../lib/product-store";
import { can, getActor } from "../../../../lib/authz";
import { saveAudit } from "../../../../lib/audit-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getActor(request);
  if (!actor?.merchantId || (!can(actor, "catalogue:write") && !can(actor, "inventory:write"))) {
    return Response.json({ error: "Inventory or catalogue permission is required." }, { status: actor ? 403 : 401 });
  }
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid product ID." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (Number.isInteger(Number(body.inventoryDelta))) {
    if (!can(actor, "inventory:write")) return Response.json({ error: "Inventory-write permission is required." }, { status: 403 });
    const product = await changeInventory(id, Number(body.inventoryDelta), actor.merchantId);
    if (product) await saveAudit({ merchantId: actor.merchantId, sessionId: `catalogue_${id}`, eventType: "inventory.adjusted", detail: `${product.name} stock changed by ${Number(body.inventoryDelta)} by ${actor.email}`, engine: "system" });
    return product
      ? Response.json({ product })
      : Response.json({ error: "Product not found." }, { status: 404 });
  }

  const patch: Record<string, string | number | string[]> = {};
  for (const key of ["name", "category", "description", "accent"] as const) {
    if (typeof body[key] === "string" && body[key].trim()) patch[key] = body[key].trim();
  }
  for (const key of ["price", "inventory", "rating"] as const) {
    const value = Number(body[key]);
    if (Number.isFinite(value) && value >= 0) patch[key] = value;
  }
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 10);

  if (!can(actor, "catalogue:write")) return Response.json({ error: "Catalogue-write permission is required." }, { status: 403 });
  const product = await updateProduct(id, patch, actor.merchantId);
  if (product) await saveAudit({ merchantId: actor.merchantId, sessionId: `catalogue_${id}`, eventType: "catalogue.product_updated", detail: `${product.name} updated by ${actor.email}`, engine: "system" });
  return product
    ? Response.json({ product })
    : Response.json({ error: "Product not found." }, { status: 404 });
}
