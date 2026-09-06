import { listAllMerchants } from "../../../lib/authz";

export async function GET() {
  const merchants = await listAllMerchants();
  type MerchantRow = (typeof merchants)[number];
  const active = merchants
    .filter((m: MerchantRow) => m.status === "active")
    .map((m: MerchantRow) => ({ name: m.name, slug: m.slug }));
  return Response.json({ stores: active });
}
