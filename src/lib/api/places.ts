import { toPerson } from "./people";
import { request, unwrap } from "./http";
import type { Place, PlaceInput } from "./types";

export function toPlace(raw: Record<string, unknown>): Place {
  return {
    id: Number(raw.id),
    tripId: Number(raw.trip_id),
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    /* Sent as strings so the decimal survives the trip; the map wants
       numbers. */
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    category: toCategory(raw.category),
    tags: toTags(raw.tags),
    link: String(raw.link ?? ""),
    notes: String(raw.notes ?? ""),
    visited: Boolean(raw.visited),
    position: Number(raw.position ?? 0),
    addedBy: toPerson(raw.added_by ?? null),
  };
}

/* Kept as sent, even when it is not a kind the app knows: it may be one of the
   trip's own. Whatever cannot be found is drawn as Other — see kindIn. */
export function toCategory(value: unknown): string {
  return typeof value === "string" && value !== "" ? value : "other";
}

/** Always a list of strings, whatever an older API sends — or doesn't. */
export function toTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : [];
}

function toBody(input: PlaceInput) {
  return {
    name: input.name,
    address: input.address || null,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    tags: input.tags,
    link: input.link || null,
    notes: input.notes || null,
    visited: input.visited,
  };
}

export async function createPlace(tripId: number, input: PlaceInput): Promise<Place> {
  const payload = await request<{ data: Record<string, unknown> }>(`/api/trips/${tripId}/places`, {
    method: "POST",
    body: toBody(input),
  });
  return toPlace(unwrap(payload));
}

export async function updatePlace(id: number, input: PlaceInput): Promise<Place> {
  const payload = await request<{ data: Record<string, unknown> }>(`/api/places/${id}`, {
    method: "PUT",
    body: toBody(input),
  });
  return toPlace(unwrap(payload));
}

export async function deletePlace(id: number): Promise<void> {
  await request<void>(`/api/places/${id}`, { method: "DELETE" });
}

/** The whole new order in one call — see the API's reorder endpoint. */
export async function reorderPlaces(tripId: number, ids: number[]): Promise<void> {
  await request<void>(`/api/trips/${tripId}/places/order`, {
    method: "PUT",
    body: { ids },
  });
}
