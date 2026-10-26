import { toPerson } from "./people";
import { toPlace } from "./places";
import { request, unwrap } from "./http";
import type { Person, Place, TripRole } from "./types";

/* A trip's share link: the owner's controls, and the trip as anyone holding
   the link sees it. */

export type ShareRole = Exclude<TripRole, "owner">;

export interface ShareLink {
  token: string;
  role: ShareRole;
}

/** What the share link opens: the trip to read, and what it offers. */
export interface SharedTrip {
  name: string;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  startDate: string | null;
  endDate: string | null;
  owner: Person | null;
  /** What joining through this link makes you. */
  shareRole: ShareRole;
  /** Set when whoever is looking is already on the trip. */
  yourRole: TripRole | null;
  tripId: number | null;
  places: Place[];
}

export async function getShareLink(tripId: number): Promise<ShareLink | null> {
  const payload = await request<{ data: ShareLink | null }>(`/api/trips/${tripId}/share`);
  return payload.data;
}

/** Turns the link on, or changes what it grants. The link itself stays the same. */
export async function setShareLink(tripId: number, role: ShareRole): Promise<ShareLink> {
  const payload = await request<{ data: ShareLink }>(`/api/trips/${tripId}/share`, { method: "PUT", body: { role } });
  return payload.data;
}

export async function turnOffShareLink(tripId: number): Promise<void> {
  await request<void>(`/api/trips/${tripId}/share`, { method: "DELETE" });
}

/** The address to send. Built on wherever the app is served from. */
export function shareUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}s/${token}`;
}

export async function fetchSharedTrip(token: string): Promise<SharedTrip> {
  // Open to anyone: a 401 here would only mean a stale token, never "sign in".
  const raw = unwrap(
    await request<{ data: Record<string, unknown> }>(`/api/shared/${encodeURIComponent(token)}`, {
      allowUnauthorized: true,
    }),
  );

  return {
    name: String(raw.name ?? ""),
    destination: String(raw.destination ?? ""),
    destinationLat: raw.destination_lat == null ? null : Number(raw.destination_lat),
    destinationLng: raw.destination_lng == null ? null : Number(raw.destination_lng),
    startDate: (raw.start_date as string) ?? null,
    endDate: (raw.end_date as string) ?? null,
    owner: toPerson(raw.owner ?? null),
    shareRole: raw.share_role === "editor" ? "editor" : "viewer",
    yourRole: (raw.your_role as TripRole) ?? null,
    tripId: raw.trip_id == null ? null : Number(raw.trip_id),
    places: Array.isArray(raw.places) ? (raw.places as Record<string, unknown>[]).map(toPlace) : [],
  };
}

/** Onto the trip with the link's role. Resolves to the trip to open. */
export async function joinSharedTrip(token: string): Promise<number> {
  const payload = await request<{ data: { trip_id: number } }>(`/api/shared/${encodeURIComponent(token)}/join`, {
    method: "POST",
  });
  return Number(payload.data.trip_id);
}

/** A copy of your own. Resolves to the new trip. */
export async function copySharedTrip(token: string): Promise<number> {
  const payload = await request<{ data: { trip_id: number } }>(`/api/shared/${encodeURIComponent(token)}/copy`, {
    method: "POST",
  });
  return Number(payload.data.trip_id);
}
