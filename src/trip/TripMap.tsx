import { useEffect, useMemo, useRef } from "react";
import { AttributionControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { WORLD_VIEW } from "../config";
import { categoryOf } from "../lib/categories";
import type { Place, Trip } from "../lib/api/types";

/* The map.

   OpenStreetMap's own tiles: free, no key, no account, no billing — which was
   the whole point of choosing this over Google. They are also the only major
   free basemap left that asks for nothing; CARTO's Positron, the obvious
   choice for a muted look, now watermarks every tile with "API KEY REQUIRED".

   The cost is that these are full-colour, and a colourful basemap competes
   with the pins for the one thing on screen that matters. So they are toned
   down in CSS instead (see .leaflet-tile in styles/base.css): desaturated and
   lifted until the map reads as paper and the pins are the loudest thing on
   it. Same result, nobody's key.
*/
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  const centre = trip.destinationLat !== null && trip.destinationLng !== null
    ? { lat: trip.destinationLat, lng: trip.destinationLng, zoom: 11 }
    : WORLD_VIEW;

  return (
    <MapContainer
      center={[centre.lat, centre.lng]}
      zoom={centre.zoom}
      zoomControl={false}
      className="h-full w-full"
      /* Placed by hand, top-right: the sheet covers the bottom corner where
         Leaflet puts this by default, and OpenStreetMap's tiles are free on
         the condition that the credit is visible. */
      attributionControl={false}
    >
      <AttributionControl position="topright" prefix={false} />
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} />

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={pinIcon(place, place.id === selectedId)}
          title={place.name}
          zIndexOffset={place.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(place.id) }}
        />
      ))}

      <FitToPlaces places={places} bottomPadding={bottomPadding} />
      <LongPress onLongPress={onDropPin} />
    </MapContainer>
  );
}

/* A circle in the category's colour with an ink ring — not Leaflet's blue
   teardrop, which belongs to a different app. Visited places go hollow: still
   there, no longer something to do. */
function pinIcon(place: Place, selected: boolean): L.DivIcon {
  const colour = categoryOf(place.category).color;
  const size = selected ? 26 : 18;

  return L.divIcon({
    className: "pin-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <span style="
        display:block; width:${size}px; height:${size}px; border-radius:999px;
        background:${place.visited ? "var(--color-paper)" : colour};
        border:${place.visited ? `2.5px solid ${colour}` : "1.5px solid var(--color-paper)"};
        box-shadow:${selected ? "var(--shadow-pin)" : "0 1px 3px rgb(28 26 23 / 0.3)"};
        transition:width .18s var(--ease-settle), height .18s var(--ease-settle);
      "></span>`,
  });
}

/** Keeps every pin in view — but never fights a map the user just moved. */
function FitToPlaces({ places, bottomPadding }: { places: Place[]; bottomPadding: number }) {
  const map = useMap();
  const fitted = useRef("");

  useEffect(() => {
    /* Refit only when the set of points actually changes: a plain dependency
       on the array would refit on every render and undo any panning. */
    const signature = places.map((p) => p.id).join(",");
    if (signature === fitted.current || places.length === 0) return;
    fitted.current = signature;

    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, {
      /* Enough at the top that a pin never hides under the attribution, and
         at the bottom whatever the sheet is currently covering — otherwise
         "fitted to your pins" means fitted to the half of them you can see. */
      paddingTopLeft: [32, 56],
      paddingBottomRight: [32, bottomPadding],
      maxZoom: 15,
      animate: false,
    });
  }, [map, places, bottomPadding]);

  return null;
}

/** A press held on open map means "here". A tap does not — that is how you
 *  pan, and a stray pin every time you moved the map would be maddening. */
function LongPress({ onLongPress }: { onLongPress: (point: { lat: number; lng: number }) => void }) {
  const timer = useRef<number | null>(null);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  useMapEvents({
    mousedown(event) {
      cancel();
      timer.current = window.setTimeout(() => onLongPress(event.latlng), 550);
    },
    mouseup: cancel,
    dragstart: cancel,
    movestart: cancel,
    // Leaflet raises this itself on touch after ~1s; keep both paths.
    contextmenu(event) {
      cancel();
      onLongPress(event.latlng);
    },
  });

  return null;
}

/** The centre a new pin should default to when there is nothing to fit. */
export function useDefaultPoint(trip: Trip, places: Place[]) {
  return useMemo(() => {
    if (places.length > 0) {
      return {
        lat: places.reduce((sum, p) => sum + p.lat, 0) / places.length,
        lng: places.reduce((sum, p) => sum + p.lng, 0) / places.length,
      };
    }
    if (trip.destinationLat !== null && trip.destinationLng !== null) {
      return { lat: trip.destinationLat, lng: trip.destinationLng };
    }
    return { lat: WORLD_VIEW.lat, lng: WORLD_VIEW.lng };
  }, [trip.destinationLat, trip.destinationLng, places]);
}
