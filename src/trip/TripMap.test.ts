import { describe, expect, it } from "vitest";
import maplibregl from "maplibre-gl";
import type { Place } from "../lib/api/types";
import { pinElement, syncPin, zoomBand } from "./TripMap";
import { categoryOf } from "../lib/categories";
import { iconOf } from "../lib/kindIcons";

const place = (over: Partial<Place> = {}): Place => ({
  id: 1,
  tripId: 7,
  name: "Fuglen Asakusa",
  address: "",
  lat: 35.7148231,
  lng: 139.7967412,
  category: "cafe",
  tags: [],
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

  it("marks the picked pin, and lets it go again", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });
    const element = marker.getElement();
    expect(element.classList.contains("is-selected")).toBe(false);

    syncPin(marker, place(), true);
    expect(element.classList.contains("is-selected")).toBe(true);
    expect(element.getAttribute("aria-pressed")).toBe("true");
    // MapLibre's own classes survive the restyle.
    expect(element.classList.contains("maplibregl-marker")).toBe(true);

    syncPin(marker, place(), false);
    expect(element.classList.contains("is-selected")).toBe(false);
  });

  it("paints the pin in its kind's colour, and follows the kind when it changes", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });
    expect(marker.getElement().style.getPropertyValue("--kind")).toContain("--color-cafe");

    syncPin(marker, place({ category: "food" }), true, categoryOf("food"));
    expect(marker.getElement().style.getPropertyValue("--kind")).toContain("--color-food");
  });

  it("moves the pin when the place does", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });

    syncPin(marker, place({ lat: 35.66, lng: 139.72 }), false);

    expect(marker.getLngLat().lat).toBeCloseTo(35.66, 5);
    expect(marker.getLngLat().lng).toBeCloseTo(139.72, 5);
  });

  it("wears its kind's icon, and changes it in place when the kind changes", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });
    const element = marker.getElement();
    expect(element.dataset.icon).toBe("coffee");
    expect(element.querySelector(".pin-body path")?.getAttribute("d")).toBe(iconOf("coffee").path);

    syncPin(marker, place({ category: "food" }), false, categoryOf("food"));

    expect(marker.getElement()).toBe(element);
    expect(element.querySelectorAll(".pin-body svg")).toHaveLength(1);
    expect(element.querySelector(".pin-body path")?.getAttribute("d")).toBe(iconOf("fork-knife").path);
  });

  it("marks a place once it has been, and says so", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });

    syncPin(marker, place({ visited: true }), false);

    expect(marker.getElement().classList.contains("is-visited")).toBe(true);
    expect(marker.getElement().getAttribute("aria-label")).toBe("Fuglen Asakusa, been");
  });

  it("carries the place's name for when the map is close enough to show it", () => {
    const marker = new maplibregl.Marker({ element: pinElement(place(), false), anchor: "center" });

    syncPin(marker, place({ name: "Fuglen Tokyo" }), false);

    expect(marker.getElement().querySelector(".pin-label")?.textContent).toBe("Fuglen Tokyo");
  });
});

describe("how much a pin says at each distance", () => {
  it("is a dot for a region, a glyph for a city, a name for a street", () => {
    expect(zoomBand(8)).toBe("far");
    expect(zoomBand(11)).toBe("mid");
    expect(zoomBand(15)).toBe("near");
  });
});
