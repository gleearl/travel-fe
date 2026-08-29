import { request, unwrap } from "./http";
import type { GeocodeResult } from "./types";

/** Place search, proxied by the API to OpenStreetMap's Nominatim.
 *
 *  Submit-driven on purpose: Nominatim's usage policy is about a request a
 *  second, which a per-keystroke autocomplete would blow through in one word.
 */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const payload = await request<{ data: Record<string, unknown>[] }>(
    `/api/geocode?q=${encodeURIComponent(query)}`,
  );

  return unwrap(payload).map((raw) => ({
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
  }));
}
