# Field Guide

A travel journal you can tap. Trips, the places you want to go inside them, and
the map they all sit on.

React 19 · Vite · Tailwind v4 · MapLibre GL. The API is a separate repo,
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
  invitations/  where a mailed invitation link lands
  trips/        the list and the trip form
  trip/         the map screen: map, sheet, place list, place form, people sheet
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

**The map** is MapLibre GL drawing OpenFreeMap's "Liberty" style: white roads,
green parks, blue water, the modern web map everyone already knows how to read.
Free, no key, no account, no request limit — the credit in the corner is the
whole price. Pins are plain DOM elements in the category's colour; visited
places go hollow.

Two things about it are worth knowing before touching `src/trip/TripMap.tsx`:

- **MapLibre parses tiles in a Web Worker, and it must be given the worker file
  explicitly** (`setWorkerUrl`). Bundled by anything else — the dev server's
  dependency pre-bundler included — the worker it builds for itself comes out
  broken, and the failure is silent and total: the style loads, the sprites
  load, the canvas appears, the background colour paints, and not one tile is
  ever fetched. Nothing errors.
- **The first `fitBounds` waits for the map's `load` event.** Asked earlier, it
  works the fit out against a viewport the map has not measured yet and lands
  near the pins rather than around them.

The map screen is behind a `lazy()` for a reason: MapLibre is most of the
download, and the trips list has no map on it.

**Searching for a place** is submit-driven, not autocomplete. It goes through
the API to OpenStreetMap's Nominatim, whose usage policy is about a request a
second — a per-keystroke search would spend that on a single word. Pressing and
holding the map drops a pin anywhere instead.

**Trips can be shared.** The server sends one field — `role`, being *your* role
on that trip — and every control on the screen is drawn or not drawn from it. A
viewer gets no "Add place", no "Edit", no "Been", and the map's long-press is
inert; a `View only` stamp sits with the dates so the absence reads as a fact
about your access rather than as something that failed to load. Hidden rather
than disabled: a button that can never be enabled is furniture.

People are drawn as **initials**, and deliberately in no colour of their own —
the palette spends one saturated hue per *kind of place*, and a green avatar
beside a green pin would read as if it meant "sight". Instead `ui/Avatar.tsx`
borrows the idiom the app already speaks: the owner is inked in, everyone else
sits on paper, the same filled-versus-hollow distinction that separates a place
you have been from one you have not.

`/invitations/:token` is the one screen outside the auth guard. Whoever clicked
that link may have no account at all, so it names the trip and who sent it
before asking them for anything. Signing up from there claims the invitation on
the way through, so nobody has to come back and press accept.

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
