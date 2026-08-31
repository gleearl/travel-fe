import { CATEGORY_IDS, type Category } from "../categories";
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
    link: String(raw.link ?? ""),
    notes: String(raw.notes ?? ""),
    visited: Boolean(raw.visited),
    position: Number(raw.position ?? 0),
    addedBy: toPerson(raw.added_by ?? null),
  };
}

/** An unknown category becomes "other" rather than a pin with no colour. */
function toCategory(value: unknown): Category {
  return CATEGORY_IDS.includes(value as Category) ? (value as Category) : "other";
}

function toBody(input: PlaceInput) {
  return {
    name: input.name,
    address: input.address || null,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
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
