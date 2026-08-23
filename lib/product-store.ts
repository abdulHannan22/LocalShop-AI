import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { products } from "../db/schema";
import { catalog, type CatalogProduct } from "./catalog";
import { DEMO_MERCHANT_ID } from "./authz";
import { ensureRuntimeSchema } from "./db-init";

type ProductInput = Omit<CatalogProduct, "id">;

const fallbackByMerchant = new Map<string, CatalogProduct[]>([
  [DEMO_MERCHANT_ID, catalog.map((item) => ({ ...item }))],
]);

function fallbackProducts(merchantId: string) {
  const current = fallbackByMerchant.get(merchantId) ?? [];
  fallbackByMerchant.set(merchantId, current);
  return current;
}

function rowToProduct(row: typeof products.$inferSelect): CatalogProduct {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags) as unknown;
    if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    rating: row.rating,
    inventory: row.inventory,
    description: row.description,
    tags,
    accent: row.accent,
  };
}

async function seedIfEmpty(merchantId: string) {
  await ensureRuntimeSchema();
  const db = getDb();
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.merchantId, merchantId));
  if (Number(countRow?.count ?? 0) > 0) return;
  if (merchantId !== DEMO_MERCHANT_ID) return;
  await db.insert(products).values(
    catalog.map(({ id: _id, ...product }) => ({
      ...product,
      merchantId,
      tags: JSON.stringify(product.tags),
    })),
  );
}

export async function listProducts(merchantId = DEMO_MERCHANT_ID): Promise<CatalogProduct[]> {
  try {
    await seedIfEmpty(merchantId);
    const rows = await getDb().select().from(products).where(eq(products.merchantId, merchantId)).orderBy(asc(products.id));
    return rows.map(rowToProduct);
  } catch {
    return fallbackProducts(merchantId).map((item) => ({ ...item }));
  }
}

export async function getStoredProduct(id: number, merchantId = DEMO_MERCHANT_ID) {
  try {
    await seedIfEmpty(merchantId);
    const [row] = await getDb().select().from(products).where(and(eq(products.id, id), eq(products.merchantId, merchantId))).limit(1);
    return row ? rowToProduct(row) : null;
  } catch {
    return fallbackProducts(merchantId).find((item) => item.id === id) ?? null;
  }
}

export async function createProduct(input: ProductInput, merchantId = DEMO_MERCHANT_ID) {
  try {
    await seedIfEmpty(merchantId);
    const [row] = await getDb()
      .insert(products)
      .values({ ...input, merchantId, tags: JSON.stringify(input.tags) })
      .returning();
    return rowToProduct(row);
  } catch {
    const current = fallbackProducts(merchantId);
    const id = Math.max(0, ...current.map((item) => item.id)) + 1;
    const product = { id, ...input };
    fallbackByMerchant.set(merchantId, [...current, product]);
    return product;
  }
}

export async function updateProduct(
  id: number,
  patch: Partial<Omit<CatalogProduct, "id">>,
  merchantId = DEMO_MERCHANT_ID,
) {
  const { tags, ...fields } = patch;
  const cleanPatch: Partial<typeof products.$inferInsert> = {
    ...fields,
    ...(tags ? { tags: JSON.stringify(tags) } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    await seedIfEmpty(merchantId);
    const [row] = await getDb()
      .update(products)
      .set(cleanPatch)
      .where(and(eq(products.id, id), eq(products.merchantId, merchantId)))
      .returning();
    return row ? rowToProduct(row) : null;
  } catch {
    const current = fallbackProducts(merchantId);
    const index = current.findIndex((item) => item.id === id);
    if (index < 0) return null;
    current[index] = { ...current[index], ...patch };
    fallbackByMerchant.set(merchantId, current);
    return { ...current[index] };
  }
}

export async function changeInventory(id: number, delta: number, merchantId = DEMO_MERCHANT_ID) {
  const current = await getStoredProduct(id, merchantId);
  if (!current) return null;
  return updateProduct(id, { inventory: Math.max(0, current.inventory + delta) }, merchantId);
}
