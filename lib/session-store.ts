import { prisma } from "./prisma";
import type { MatchQuality, ShoppingIntent } from "./catalog";

export async function saveShoppingSession(input: {
  id: string;
  merchantId: string;
  customerEmail?: string;
  query: string;
  intent: ShoppingIntent;
  engine: string;
  matchQuality?: MatchQuality;
  topProductId?: number | null;
}) {
  await prisma.shoppingSession.create({
    data: {
      id: input.id,
      merchantId: input.merchantId,
      customerEmail: input.customerEmail?.trim().toLowerCase() || null,
      query: input.query,
      intentJson: JSON.stringify(input.intent),
      engine: input.engine,
      status: "active",
      matchQuality: input.matchQuality ?? null,
      topProductId: input.topProductId ?? null,
    },
  });
  return true;
}

export async function getShoppingSession(id: string, merchantId: string) {
  return prisma.shoppingSession.findFirst({ where: { id, merchantId } });
}
