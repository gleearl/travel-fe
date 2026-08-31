import { request, unwrap } from "./http";
import { toRole } from "./people";
import type { Invitation, InvitationPreview, TripRole } from "./types";

export function toInvitation(raw: Record<string, unknown>): Invitation {
  return {
    id: Number(raw.id),
    email: String(raw.email ?? ""),
    role: toRole(raw.role),
    expiresAt: String(raw.expires_at ?? ""),
  };
}

/**
 * Ask somebody onto a trip.
 *
 * The answer is the same whether or not that address has an account here, so
 * there is nothing to read from it either way — see the API's
 * InvitationController for why that is deliberate.
 */
export async function invite(
  tripId: number,
  email: string,
  role: TripRole,
): Promise<Invitation> {
  const payload = await request<{ data: Record<string, unknown> }>(
    `/api/trips/${tripId}/invitations`,
    { method: "POST", body: { email, role } },
  );

  return toInvitation(unwrap(payload));
}

/**
 * What an invitation link points at.
 *
 * The one call in the app that works with nobody signed in: whoever clicked the
 * link may have no account at all, and the screen has to be able to name the
 * trip before it asks them for anything.
 */
export async function readInvitation(token: string): Promise<InvitationPreview> {
  const payload = await request<{ data: Record<string, unknown> }>(
    `/api/invitations/${encodeURIComponent(token)}`,
    { allowUnauthorized: true },
  );
  const raw = unwrap(payload);

  return {
    tripName: String(raw.trip_name ?? ""),
    invitedBy: String(raw.invited_by ?? ""),
    role: toRole(raw.role),
    email: String(raw.email ?? ""),
    hasAccount: Boolean(raw.has_account),
  };
}

/** Take the invitation up. Resolves to the trip it just put you on. */
export async function acceptInvitation(token: string): Promise<number> {
  const payload = await request<{ data: { trip_id: number } }>(
    `/api/invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );

  return Number(unwrap(payload).trip_id);
}

export async function revokeInvitation(id: number): Promise<void> {
  await request<void>(`/api/invitations/${id}`, { method: "DELETE" });
}
