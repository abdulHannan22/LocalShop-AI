import { resolveCustomer } from "../../../../lib/customer-auth";

export async function GET(request: Request) {
  const customer = await resolveCustomer(request);
  return customer
    ? Response.json({ customer })
    : Response.json({ error: "Not signed in." }, { status: 401 });
}
