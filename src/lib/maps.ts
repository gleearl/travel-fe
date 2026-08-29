/* ==========================================================================
   Links into Google Maps.

   No API key, no billing account, no terms to accept: these are the documented
   Maps URLs, which anyone may link to from anywhere. An embedded map would
   need a key, and the key needs a card on file — so we link out instead.

   On a phone these open the Google Maps app rather than the web page.
   ========================================================================== */

import type { Place } from "./api/types";

type Located = Pick<Place, "name" | "address" | "lat" | "lng">;

const BASE = "https://www.google.com/maps";

/** The place itself: its listing where Google has one, its coordinates where not. */
export function googleMapsUrl(place: Located): string {
  /* By name and address when we have both, so Google resolves it to its own
     listing — photos, opening hours, reviews — instead of a bare dropped pin.
     A place with no address is normally a pin dropped by hand, whose name
     Google has never heard of, so those go by coordinate. */
  const query = place.address ? `${place.name}, ${place.address}` : coordinates(place);

  return `${BASE}/search/?api=1&query=${encodeURIComponent(query)}`;
}

function coordinates(place: Located): string {
  return `${place.lat},${place.lng}`;
}

/** Hosts whose links stand in for a real one, and have to be followed. */
const SHORT_HOSTS = ["maps.app.goo.gl", "goo.gl", "g.co"];

/**
 * Does this look like a link out of Google Maps, rather than words to search?
 *
 * Only asks the question the search box needs answered: whether to hand the
 * line to the API to resolve, or to search for it as a name. Whether the link
 * actually points at a place is the API's business — it is the one that can
 * follow a share link to find out.
 */
export function looksLikeMapsLink(input: string): boolean {
  const trimmed = input.trim();

  if (trimmed === "" || /\s/.test(trimmed)) return false;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();

  if (SHORT_HOSTS.includes(host)) return true;

  return /(^|\.)google(\.[a-z]{2,3}){1,2}$/i.test(host)
    && (url.pathname.startsWith("/maps") || url.searchParams.has("q"));
}
