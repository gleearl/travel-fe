import { CATEGORY_IDS, type Category } from "../categories";
import { request, unwrap } from "./http";
import type { LibraryPlace } from "./types";

/**
 * Places this account has saved before, matched as a name is typed.
 *
 * Unlike `searchPlaces`, this runs on every keystroke rather than on a button.
 * The once-a-second rule that makes the geocoder submit-driven is Nominatim's,
 * and nothing here leaves our own server — it reads a table this account
 * already owns.
 */
export async function searchLibrary(query: string): Promise<LibraryPlace[]> {
  const payload = await request<{ data: Record<string, unknown>[] }>(
    `/api/places/library?q=${encodeURIComponent(query)}`,
  );

  return unwrap(payload).map((raw) => ({
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    // Sent as strings so the decimal survives the trip; the form wants numbers.
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    category: CATEGORY_IDS.includes(raw.category as Category)
      ? (raw.category as Category)
      : "other",
    link: String(raw.link ?? ""),
    notes: String(raw.notes ?? ""),
    tripName: String(raw.trip_name ?? ""),
  }));
}
