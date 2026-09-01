import { request, unwrap } from "./http";
import { toCollaborator, toPerson, toRole } from "./people";
import { toPlace } from "./places";
import type { Trip, TripInput } from "./types";

/* Laravel answers in snake_case and sends coordinates as strings — decimals
   that would lose precision through a float. Everything crossing into the app
   is converted here, so no component ever sees the wire format. */
export function toTrip(raw: Record<string, unknown>): Trip {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    destination: String(raw.destination ?? ""),
    destinationLat: numberOrNull(raw.destination_lat),
    destinationLng: numberOrNull(raw.destination_lng),
    startDate: (raw.start_date as string) ?? null,
    endDate: (raw.end_date as string) ?? null,
    archivedAt: (raw.archived_at as string) ?? null,
    placeCount: Number(raw.place_count ?? 0),
    /* Two different absences, two different answers. No role *field* at all is
       a response from before sharing existed, which can only be a trip of your
       own — the server sends nobody else's — so guessing "viewer" would lock
       people out of their own trips. A role that is present but unrecognised is
       something else entirely, and gets the cautious reading. */
    role: raw.role === undefined || raw.role === null ? "owner" : toRole(raw.role),
    owner: toPerson(raw.owner ?? null),
    collaborators: Array.isArray(raw.collaborators)
      ? (raw.collaborators as Record<string, unknown>[]).map(toCollaborator)
      : [],
    places: Array.isArray(raw.places)
      ? (raw.places as Record<string, unknown>[]).map(toPlace)
      : [],
  };
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBody(input: TripInput) {
  return {
    name: input.name,
    destination: input.destination || null,
    destination_lat: input.destinationLat,
    destination_lng: input.destinationLng,
    // An empty date field is "no date", not the epoch.
    start_date: input.startDate || null,
    end_date: input.endDate || null,
  };
}

/* One list or the other, never both. The archive is somewhere you go rather
   than a section that grows on the end of the main list, so asking for it is a
   separate call and the everyday answer stays as small as it was. */
export async function fetchTrips(options?: { archived?: boolean }): Promise<Trip[]> {
  const path = options?.archived ? "/api/trips?archived=1" : "/api/trips";
  const payload = await request<{ data: Record<string, unknown>[] }>(path);
  return unwrap(payload).map(toTrip);
}

export async function fetchTrip(id: number): Promise<Trip> {
  const payload = await request<{ data: Record<string, unknown> }>(`/api/trips/${id}`);
  return toTrip(unwrap(payload));
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const payload = await request<{ data: Record<string, unknown> }>("/api/trips", {
    method: "POST",
    body: toBody(input),
  });
  return toTrip(unwrap(payload));
}

export async function updateTrip(id: number, input: TripInput): Promise<Trip> {
  const payload = await request<{ data: Record<string, unknown> }>(`/api/trips/${id}`, {
    method: "PUT",
    body: toBody(input),
  });
  return toTrip(unwrap(payload));
}

/* Both answer 204 and neither hands anything back: the caller already knows
   which trip it asked about, and the list is refetched either way. */
export async function archiveTrip(id: number): Promise<void> {
  await request<void>(`/api/trips/${id}/archive`, { method: "POST" });
}

export async function unarchiveTrip(id: number): Promise<void> {
  await request<void>(`/api/trips/${id}/archive`, { method: "DELETE" });
}

export async function deleteTrip(id: number): Promise<void> {
  await request<void>(`/api/trips/${id}`, { method: "DELETE" });
}
