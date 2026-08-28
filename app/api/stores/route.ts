import { listAllMerchants } from "../../../lib/authz";

export async function GET() {
  const merchants = await listAllMerchants();
  const active = merchants
    .filter((merchant) => merchant.status === "active")
    .map((merchant) => ({ name: merchant.name, slug: merchant.slug }));
  return Response.json({ stores: active });
}