import { getActor } from "../../../lib/authz";

export async function GET(request: Request) {
  const actor = await getActor(request);
  return actor
    ? Response.json({ actor })
    : Response.json({ error: "Sign in is required." }, { status: 401 });
}
