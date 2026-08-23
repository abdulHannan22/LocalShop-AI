import { createProduct, listProducts } from "../../../lib/product-store";
import { can, getActor, resolveMerchantBySlug } from "../../../lib/authz";
import { saveAudit } from "../../../lib/audit-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeSlug = url.searchParams.get("store")?.trim();
  if (storeSlug) {
    const merchant = await resolveMerchantBySlug(storeSlug);
    return merchant
      ? Response.json({ merchant: { name: merchant.name, slug: merchant.slug }, products: await listProducts(merchant.id) })
      : Response.json({ error: "Store not found." }, { status: 404 });
  }
  const actor = await getActor(request);
  if (!actor?.merchantId) return Response.json({ error: "Merchant access is required." }, { status: actor ? 403 : 401 });
  return Response.json({ products: await listProducts(actor.merchantId) });
}

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "catalogue:write") || !actor?.merchantId) {
    return Response.json({ error: "Catalogue-write permission is required." }, { status: actor ? 403 : 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const price = Number(body.price);
  const inventory = Number(body.inventory);
  if (!name || !category || !description || !Number.isInteger(price) || price < 1 || !Number.isInteger(inventory) || inventory < 0) {
    return Response.json({ error: "Name, category, description, positive price and valid stock are required." }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 10)
    : category.toLowerCase().split(/\s+/);
  const product = await createProduct({
    name,
    category,
    description,
    price,
    inventory,
    rating: 4.5,
    tags,
    accent: ["lime", "blue", "orange", "violet"][Math.floor(Math.random() * 4)],
  }, actor.merchantId);
  await saveAudit({ merchantId: actor.merchantId, sessionId: `catalogue_${product.id}`, eventType: "catalogue.product_created", detail: `${product.name} created by ${actor.email}`, engine: "system" });
  return Response.json({ product }, { status: 201 });
}
