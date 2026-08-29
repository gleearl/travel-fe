/* The API's origin. There is no same-origin case for this app — it is served
   from GitHub Pages and the API from its own host — so a blank value here is a
   misconfigured build rather than a shorthand for "relative". */
export const API_URL = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

/** Where the map opens when a trip has neither places nor a located
 *  destination: far enough out to be honest that we don't know. */
export const WORLD_VIEW = { lat: 20, lng: 10, zoom: 2 } as const;
