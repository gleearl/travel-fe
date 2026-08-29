import { request, unwrap } from "./http";
import type { GeocodeResult } from "./types";

/** Read a link shared out of Google Maps into a place.
 *
 *  Google puts the name and the point in the URL itself, so this asks Google
 *  nothing. What the API does do is follow the short link a phone's share sheet
 *  produces — an opaque code standing in for the real URL — and look up the
 *  street address at the point, which the link does not carry.
 */
export async function resolveMapLink(url: string): Promise<GeocodeResult> {
  const payload = await request<{ data: Record<string, unknown> }>(
    `/api/places/from-map-link?url=${encodeURIComponent(url)}`,
  );
  const raw = unwrap(payload);

  return {
    // A pin dropped on a street corner has no name; the form asks for one.
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
  };
}
