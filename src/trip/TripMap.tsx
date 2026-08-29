import { useEffect, useMemo, useRef, useState } from "react";
/* Default import, not named: MapLibre ships one UMD bundle and no ES module
   at all, so `import { Map }` type-checks perfectly and resolves to undefined
   at runtime. The types come in separately, where being erased at build time
   makes the distinction moot. */
import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker.js?url";

/* MapLibre parses vector tiles in a Web Worker, which it normally builds out
   of its own bundle. Bundled by anything else — the dev server's dependency
   pre-bundler included — that worker comes out broken, and the failure is
   silent and total: the style loads, the sprites load, the canvas appears, the
   background colour paints, and not one tile is ever fetched. No error is
   raised anywhere. Pointing it at the worker file the package ships is the
   supported way out, and it costs one request. */
maplibregl.setWorkerUrl(workerUrl);
import { WORLD_VIEW } from "../config";
import { categoryOf } from "../lib/categories";
import type { Place, Trip } from "../lib/api/types";

/* The map.

   OpenFreeMap's "Liberty" style, drawn from vector tiles: white roads, soft
   green parks, blue water, grey buildings — the modern web map everyone
   already knows how to read. Free, no key, no account, no request limit.

   Vector rather than raster is what makes that possible. Raster tiles arrive
   as finished pictures, so the only thing that can be done to them is a filter
   over the whole image at once. Here every layer is drawn in the browser from
   data, so roads can be white while parks stay green.

   MapLibre draws this directly rather than through Leaflet. The bridge between
   the two libraries exists, and it does not survive the dev server: bundled it
   breaks MapLibre's worker, so the style loads, the canvas appears and not one
   tile is ever fetched — no error, just a blank map. Unbundled, its own module
   interop fails outright. One library doing the whole job has neither problem.
*/
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** How long a press has to be held on open map before it means "here". */
const LONG_PRESS_MS = 550;

export function TripMap({
  trip,
  places,
  selectedId,
  onSelect,
  onDropPin,
  bottomPadding,
}: {
  trip: Trip;
  /** Already filtered — the map draws what it is given. */
  places: Place[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** A long press on open map: somewhere with no name yet. */
  onDropPin: (point: { lat: number; lng: number }) => void;
  /** How much of the bottom of the map the sheet is covering, so fitting the
   *  pins puts them where they can actually be seen. */
  bottomPadding: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<number, MapLibreMarker>());
  /* Nothing may move the camera until the map says it is ready. Asked to fit
     bounds before it has measured itself, it works the fit out against a
     viewport it does not have yet and lands somewhere near the pins rather
     than around them — which looks like the fit simply being wrong. */
  const [ready, setReady] = useState(false);

  /* Handlers reach the map through a ref rather than through the effect's
     dependencies: rebuilding the map because a callback changed identity would
     throw away the tiles and the camera along with it. */
  const handlers = useRef({ onSelect, onDropPin });
  handlers.current = { onSelect, onDropPin };

  const centre =
    trip.destinationLat !== null && trip.destinationLng !== null
      ? { lat: trip.destinationLat, lng: trip.destinationLng, zoom: 11 }
      : WORLD_VIEW;

  /* ── The map itself. Built once, and only once. ───────────────────────── */
  useEffect(() => {
    if (!container.current) return;

    const created = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      center: [centre.lng, centre.lat],
      zoom: centre.zoom,
      /* The sheet covers the bottom of the map, so what MapLibre puts in the
         bottom corner by default has to move. */
      attributionControl: false,
    });

    /* The credit OpenFreeMap asks for — and the whole price of the map — is
       declared by the style itself, so this control only has to show it.
       Adding it again by hand printed it twice, separated by a pipe. Compact,
       because at this width the full line runs the width of the screen. */
    created.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");

    /* A press held on open map means "here". A tap does not — that is how you
       pan, and a stray pin every time you moved the map would be maddening.
       Desktop gets the same gesture through the right-click that a long press
       raises there anyway. */
    let timer: number | null = null;
    const cancel = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };

    created.on("touchstart", (event) => {
      cancel();
      const point = event.lngLat;
      timer = window.setTimeout(() => handlers.current.onDropPin({ lat: point.lat, lng: point.lng }), LONG_PRESS_MS);
    });
    created.on("touchend", cancel);
    created.on("touchcancel", cancel);
    created.on("movestart", cancel);
    created.on("contextmenu", (event) => {
      cancel();
      handlers.current.onDropPin({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    created.on("load", () => setReady(true));

    map.current = created;

    return () => {
      setReady(false);
      cancel();
      created.remove();
      map.current = null;
      markers.current.clear();
    };
    // Built from the trip's opening view; later changes move the camera rather
    // than rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── The pins ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const current = map.current;
    if (!current) return;

    const live = markers.current;

    // Gone from the list, gone from the map.
    for (const [id, marker] of live) {
      if (!places.some((place) => place.id === id)) {
        marker.remove();
        live.delete(id);
      }
    }

    for (const place of places) {
      const existing = live.get(place.id);

      if (existing) {
        /* Restyled in place. The pin MapLibre was handed is the pin it keeps
           writing positions to, and swapping the node out from under it is how
           pins come loose from their coordinates. */
        syncPin(existing, place, place.id === selectedId);
        continue;
      }

      const element = pinElement(place, place.id === selectedId);
      element.addEventListener("click", (event) => {
        /* Otherwise the map takes this as a click on itself and the press
           begins a drag of the whole world. */
        event.stopPropagation();
        handlers.current.onSelect(place.id);
      });

      live.set(
        place.id,
        new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([place.lng, place.lat])
          .addTo(current),
      );
    }
  }, [places, selectedId]);

  /* ── Keeping every pin in view ────────────────────────────────────────── */
  const fitted = useRef("");
  useEffect(() => {
    const current = map.current;
    if (!current || !ready || places.length === 0) return;

    /* Refit only when the set of points actually changes. Fitting on every
       render would undo any panning the moment anything else updated. */
    const signature = places.map((place) => place.id).join(",");
    if (signature === fitted.current) return;
    fitted.current = signature;

    const bounds = places.reduce(
      (box, place) => box.extend([place.lng, place.lat]),
      new maplibregl.LngLatBounds([places[0].lng, places[0].lat], [places[0].lng, places[0].lat]),
    );

    current.fitBounds(bounds, {
      /* Room at the top for the attribution, and at the bottom for whatever
         the sheet is covering — otherwise "fitted to your pins" means fitted
         to the half of them you can see. */
      padding: { top: 72, bottom: bottomPadding, left: 48, right: 48 },
      maxZoom: 15,
      animate: false,
    });
  }, [places, bottomPadding, ready]);

  return <div ref={container} className="h-full w-full" />;
}

/* A circle in the category's colour with a paper ring — not a teardrop pin,
   which belongs to a different map. Visited places go hollow: still there, no
   longer something to do. */
export function pinElement(place: Place, selected: boolean): HTMLElement {
  const element = document.createElement("button");
  element.type = "button";

  /* The parts that never change. Set once, and never through cssText again —
     see applyPinStyle. */
  element.style.borderRadius = "999px";
  element.style.padding = "0";
  element.style.cursor = "pointer";
  element.style.transition = "width .18s var(--ease-settle), height .18s var(--ease-settle)";

  applyPinStyle(element, place, selected);

  return element;
}

/**
 * Bring an existing pin up to date: its size, its colour, where it is.
 *
 * The marker keeps the element it was built with. MapLibre positions a pin by
 * writing a transform to that element on every move, and the element only sits
 * where the transform puts it because the class MapLibre's constructor added
 * makes it absolutely positioned. Give the marker a different node and it goes
 * on writing transforms to something left in normal flow — so the pin drifts
 * off its coordinates, and further at every zoom.
 */
export function syncPin(marker: MapLibreMarker, place: Place, selected: boolean): void {
  applyPinStyle(marker.getElement(), place, selected);
  marker.setLngLat([place.lng, place.lat]);
}

/* Property by property rather than through cssText: MapLibre keeps the pin's
   position in the transform on this same style object, and assigning cssText
   would wipe it — dropping every pin onto the map's top left corner until the
   next time the camera moved. */
function applyPinStyle(element: HTMLElement, place: Place, selected: boolean): void {
  const colour = categoryOf(place.category).color;
  const size = selected ? 26 : 18;

  element.title = place.name;
  element.setAttribute("aria-label", place.name);
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.background = place.visited ? "var(--color-paper)" : colour;
  element.style.border = place.visited ? `2.5px solid ${colour}` : "1.5px solid var(--color-paper)";
  element.style.boxShadow = selected ? "var(--shadow-pin)" : "0 1px 3px rgb(28 26 23 / 0.3)";
}

/** The centre a new pin should default to when there is nothing to fit. */
export function useDefaultPoint(trip: Trip, places: Place[]) {
  return useMemo(() => {
    if (places.length > 0) {
      return {
        lat: places.reduce((sum, place) => sum + place.lat, 0) / places.length,
        lng: places.reduce((sum, place) => sum + place.lng, 0) / places.length,
      };
    }
    if (trip.destinationLat !== null && trip.destinationLng !== null) {
      return { lat: trip.destinationLat, lng: trip.destinationLng };
    }
    return { lat: WORLD_VIEW.lat, lng: WORLD_VIEW.lng };
  }, [trip.destinationLat, trip.destinationLng, places]);
}
