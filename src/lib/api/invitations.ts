import { request, unwrap } from "./http";
import { toPerson, toRole } from "./people";
import type { Invitation, TripRole } from "./types";

export function toInvitation(raw: Record<string, unknown>): Invitation {
  const trip = (raw.trip ?? {}) as Record<string, unknown>;

  return {
    id: Number(raw.id),
    role: toRole(raw.role),
    user: toPerson(raw.user ?? null),
    invitedBy: toPerson(raw.invited_by ?? null),
    trip: {
      id: Number(trip.id),
      name: String(trip.name ?? ""),
      destination: String(trip.destination ?? ""),
      startDate: (trip.start_date as string) ?? null,
      endDate: (trip.end_date as string) ?? null,
    },
  };
}

/**
 * Ask somebody onto a trip.
 *
 * The address has to belong to an account that already exists — an invitation
 * is answered inside the app, so there is nowhere to send one otherwise. The
 * server says so in a 422 on `email`, which the form shows.
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

/** What is waiting on this account to answer. */
export async function fetchMyInvitations(): Promise<Invitation[]> {
  const payload = await request<{ data: Record<string, unknown>[] }>("/api/invitations");

  return unwrap(payload).map(toInvitation);
}

/** Take it up. Resolves to the trip it just put you on. */
export async function acceptInvitation(id: number): Promise<number> {
  const payload = await request<{ data: { trip_id: number } }>(
    `/api/invitations/${id}/accept`,
    { method: "POST" },
  );

  return Number(unwrap(payload).trip_id);
}

/* Declining and revoking are the same row disappearing — the server works out
   which one it is from who is asking. Two names here because they are two
   different things to mean, and a caller should not have to think about it. */

export async function declineInvitation(id: number): Promise<void> {
  await request<void>(`/api/invitations/${id}`, { method: "DELETE" });
}

export async function revokeInvitation(id: number): Promise<void> {
  await request<void>(`/api/invitations/${id}`, { method: "DELETE" });
}
