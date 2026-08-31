import { request, unwrap } from "./http";
import { toCollaborator } from "./people";
import { toInvitation } from "./invitations";
import type { Collaborator, Invitation, TripRole } from "./types";

/** Everyone on a trip, and — when the owner is asking — everyone still invited. */
export interface TripPeople {
  owner: Collaborator;
  members: Collaborator[];
  /** Always empty for anyone but the owner: an invitation is only an email. */
  invitations: Invitation[];
}

export async function fetchMembers(tripId: number): Promise<TripPeople> {
  const payload = await request<{ data: Record<string, unknown> }>(`/api/trips/${tripId}/members`);
  const raw = unwrap(payload);

  return {
    owner: toCollaborator(raw.owner as Record<string, unknown>),
    members: ((raw.members ?? []) as Record<string, unknown>[]).map(toCollaborator),
    invitations: ((raw.invitations ?? []) as Record<string, unknown>[]).map(toInvitation),
  };
}

export async function setMemberRole(
  tripId: number,
  userId: number,
  role: TripRole,
): Promise<Collaborator> {
  const payload = await request<{ data: Record<string, unknown> }>(
    `/api/trips/${tripId}/members/${userId}`,
    { method: "PUT", body: { role } },
  );

  return toCollaborator(unwrap(payload));
}

export async function removeMember(tripId: number, userId: number): Promise<void> {
  await request<void>(`/api/trips/${tripId}/members/${userId}`, { method: "DELETE" });
}

/** Take yourself off. Its own path rather than .../members/me — see the API's
 *  routes file: "me" is a perfectly good id-shaped segment. */
export async function leaveTrip(tripId: number): Promise<void> {
  await request<void>(`/api/trips/${tripId}/membership`, { method: "DELETE" });
}
