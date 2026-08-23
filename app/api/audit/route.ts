import { listAudit, listRecentAudit } from "../../../lib/audit-store";
import { can, getActor } from "../../../lib/authz";

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor?.merchantId || !can(actor, "audit:read")) return Response.json({ error: "Audit permission is required." }, { status: actor ? 403 : 401 });
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
  return Response.json({
    events: sessionId ? await listAudit(sessionId, actor.merchantId) : await listRecentAudit(60, actor.merchantId),
  });
}
