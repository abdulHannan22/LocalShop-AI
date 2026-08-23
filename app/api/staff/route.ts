import { can, getActor, inviteStaff, listStaff, updateStaffMembership, type MerchantRole } from "../../../lib/authz";
import { saveAudit } from "../../../lib/audit-store";

const allowedRoles: MerchantRole[] = ["admin", "manager", "sales_agent"];

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "staff:manage")) return Response.json({ error: "Staff-management permission is required." }, { status: actor ? 403 : 401 });
  return Response.json({ staff: await listStaff(actor!) });
}

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "staff:manage")) return Response.json({ error: "Staff-management permission is required." }, { status: actor ? 403 : 401 });
  const body = (await request.json()) as { email?: string; role?: MerchantRole };
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role;
  if (!/^\S+@\S+\.\S+$/.test(email) || !role || !allowedRoles.includes(role)) {
    return Response.json({ error: "A valid email and staff role are required." }, { status: 400 });
  }
  const membership = await inviteStaff(actor!, email, role);
  if (!membership) return Response.json({ error: "The invitation could not be created." }, { status: 500 });
  await saveAudit({ merchantId: actor!.merchantId!, sessionId: `staff_${membership.id}`, eventType: "staff.invited", detail: `${email} invited as ${role}`, engine: "system" });
  return Response.json({ membership }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await getActor(request);
  if (!can(actor, "staff:manage")) return Response.json({ error: "Staff-management permission is required." }, { status: actor ? 403 : 401 });
  const body = (await request.json()) as { membershipId?: string; role?: Exclude<MerchantRole, "owner">; status?: "active" | "suspended" | "invited" };
  if (!body.membershipId || !body.role || !allowedRoles.includes(body.role) || !body.status || !["active", "suspended", "invited"].includes(body.status)) {
    return Response.json({ error: "A valid membership, role and status are required." }, { status: 400 });
  }
  const membership = await updateStaffMembership(actor!, body.membershipId, body.role, body.status);
  if (!membership) return Response.json({ error: "Staff membership not found or owner protection blocked the change." }, { status: 404 });
  await saveAudit({ merchantId: actor!.merchantId!, sessionId: `staff_${membership.id}`, eventType: "staff.updated", detail: `${membership.email} changed to ${membership.role} (${membership.status})`, engine: "system" });
  return Response.json({ membership });
}
