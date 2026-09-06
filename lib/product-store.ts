import { prisma } from "./prisma";
import { catalog, type CatalogProduct } from "./catalog";
import { DEMO_MERCHANT_ID, DEMO_MERCHANTS } from "./authz";

type ProductInput = Omit<CatalogProduct, "id">;

function rowToProduct(row: {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inventory: number;
  description: string;
  tags: string;
  accent: string;
  imageUrl: string | null;
}): CatalogProduct {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags) as unknown;
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    tags = [];
  }
  return { id: row.id, name: row.name, category: row.category, price: row.price, rating: row.rating, inventory: row.inventory, description: row.description, tags, accent: row.accent, imageUrl: row.imageUrl };
}

async function seedIfEmpty(merchantId: string) {
  const isDemoMerchant = DEMO_MERCHANTS.some((m) => m.id === merchantId);
  if (!isDemoMerchant) return;
  const count = await prisma.product.count({ where: { merchantId } });
  if (count > 0) return;
  // Each demo store gets all 20 catalog products (prices vary slightly per store)
  const priceMultiplier: Record<string, number> = {
    merchant_nova: 1.0,
    merchant_spark: 0.95,
    merchant_zenith: 1.05,
    merchant_pixel: 0.98,
    merchant_orbit: 1.02,
  };
  const mult = priceMultiplier[merchantId] ?? 1.0;
  await prisma.product.createMany({
    data: catalog.map(({ id: _id, ...product }) => ({
      ...product,
      price: Math.round(product.price * mult),
      merchantId,
      tags: JSON.stringify(product.tags),
    })),
  });
}

export async function listProducts(merchantId = DEMO_MERCHANT_ID): Promise<CatalogProduct[]> {
  await seedIfEmpty(merchantId);
  const rows = await prisma.product.findMany({ where: { merchantId }, orderBy: { id: "asc" } });
  return rows.map(rowToProduct);
}

export async function getStoredProduct(id: number, merchantId = DEMO_MERCHANT_ID) {
  await seedIfEmpty(merchantId);
  const row = await prisma.product.findFirst({ where: { id, merchantId } });
  return row ? rowToProduct(row) : null;
}

export async function createProduct(input: ProductInput, merchantId = DEMO_MERCHANT_ID) {
  await seedIfEmpty(merchantId);
  const row = await prisma.product.create({
    data: { ...input, merchantId, tags: JSON.stringify(input.tags) },
  });
  return rowToProduct(row);
}

export async function updateProduct(id: number, patch: Partial<Omit<CatalogProduct, "id">>, merchantId = DEMO_MERCHANT_ID) {
  const { tags, ...fields } = patch;
  await seedIfEmpty(merchantId);
  const result = await prisma.product.updateMany({
    where: { id, merchantId },
    data: { ...fields, ...(tags ? { tags: JSON.stringify(tags) } : {}) },
  });
  if (result.count === 0) return null;
  const row = await prisma.product.findFirst({ where: { id, merchantId } });
  return row ? rowToProduct(row) : null;
}

export async function changeInventory(id: number, delta: number, merchantId = DEMO_MERCHANT_ID) {
  const current = await getStoredProduct(id, merchantId);
  if (!current) return null;
  return updateProduct(id, { inventory: Math.max(0, current.inventory + delta) }, merchantId);
}
