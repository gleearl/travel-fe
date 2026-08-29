# Field Guide

A travel journal you can tap. Trips, the places you want to go inside them, and
the map they all sit on.

React 19 · Vite · Tailwind v4 · Leaflet. The API is a separate repo,
[`travel-laravel`](../travel-laravel).

## Running it

```bash
npm install
npm run dev
```

That's `http://localhost:5173/travel-fe/` — the sub-path is deliberate, because
GitHub Pages serves the app from `/travel-fe/` and a base path that only exists
in production is a base path nobody tests. Start the API in the other repo
first; `.env.development` already points at it.

```bash
npm test        # vitest
npx tsc -b      # types
npm run build
```

## How it is put together

```
src/
  lib/api/      every call to the server, and the only place that knows the wire format
  auth/         the token, the four sign-in screens, and the route guard
  trips/        the list and the trip form
  trip/         the map screen: map, sheet, place list, place form
  ui/           the pieces every screen is built from
  styles/       theme.css is the whole palette and type system
```

**The design is "field guide".** Warm paper rather than white, ink rather than
grey, and one saturated colour per kind of place. Fraunces carries the names of
things; Archivo carries everything you have to read quickly. Every colour and
size lives in `src/styles/theme.css` as a Tailwind token — a component that
needs a hex code is a component that has got ahead of the design.

**Mobile first, and literally so.** The trip screen is a full-bleed map with the
list in a sheet over it, at three stops: a peek showing the selected place, a
half-height reading position, and the full list. It is dragged with Pointer
Events (`src/trip/BottomSheet.tsx`, no drag library) and it settles by velocity
as well as position, so a flick closes it. The handle is also a button, because
a drag handle nobody can drag is a control only some people have.

From `lg` up the same panel becomes a fixed rail beside the map. One component;
the layout is the only difference.

**The map** uses CARTO's Positron tiles — free, no key — because a near-
monochrome basemap lets your own pins be the loudest thing on screen. Pins are
`divIcon`s in the category's colour; visited places go hollow.

**Searching for a place** is submit-driven, not autocomplete. It goes through
the API to OpenStreetMap's Nominatim, whose usage policy is about a request a
second — a per-keystroke search would spend that on a single word. Pressing and
holding the map drops a pin anywhere instead.

**Auth is a bearer token**, kept in `localStorage` and attached by
`src/lib/api/http.ts`. Not a cookie: the app is served from `github.io` and the
API from another host, so a session cookie between them would be third-party
and dropped by the browser.

## Deploying

Push to `main`. `.github/workflows/pages.yml` runs the tests, builds, copies
`index.html` to `404.html` for the SPA fallback, and publishes to Pages.

Once, in the repo's settings: **Settings → Pages → Source: GitHub Actions**.

The API's origin lives in `.env.production`. If it ever moves, that file and
`FRONTEND_URL` on the server are the two things to change.
