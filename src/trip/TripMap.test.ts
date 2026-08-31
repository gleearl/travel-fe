import { describe, expect, it } from "vitest";
import maplibregl from "maplibre-gl";
import type { Place } from "../lib/api/types";
import { pinElement, syncPin } from "./TripMap";

const place = (over: Partial<Place> = {}): Place => ({
  id: 1,
  tripId: 7,
  name: "Fuglen Asakusa",
  address: "",
  lat: 35.7148231,
  lng: 139.7967412,
  category: "cafe",
  link: "",
  notes: "",
  visited: false,
  position: 1,
  addedBy: null,
  ...over,
});

describe("keeping a pin where it belongs", () => {
  it("restyles the pin it already has rather than swapping in a new one", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });
    const before = marker.getElement();

    syncPin(marker, place(), true);

    /* MapLibre positions a marker by writing a transform to the element it was
       given, and the element only sits at that transform because the class the
       constructor put on it makes it absolute. Hand the marker a different
       node and it goes on writing transforms to something in normal flow: the
       pin drifts away from its coordinates, further at every zoom. */
    expect(marker.getElement()).toBe(before);
    expect(marker.getElement().classList.contains("maplibregl-marker")).toBe(true);
  });

  it("still shows the selected pin larger", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });
    expect(marker.getElement().style.width).toBe("18px");

    syncPin(marker, place(), true);
    expect(marker.getElement().style.width).toBe("26px");

    syncPin(marker, place(), false);
    expect(marker.getElement().style.width).toBe("18px");
  });

  it("moves the pin when the place does", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });

    syncPin(marker, place({ lat: 35.66, lng: 139.72 }), false);

    expect(marker.getLngLat().lat).toBeCloseTo(35.66, 5);
    expect(marker.getLngLat().lng).toBeCloseTo(139.72, 5);
  });

  it("hollows out a place once it has been seen", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });

    syncPin(marker, place({ visited: true }), false);

    expect(marker.getElement().style.background).toContain("--color-paper");
  });
});
