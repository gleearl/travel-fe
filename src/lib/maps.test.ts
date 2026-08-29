import { describe, expect, it } from "vitest";
import { googleMapsUrl, looksLikeMapsLink } from "./maps";

const place = {
  name: "Fuglen Asakusa",
  address: "2-6-15 Asakusa, Taito City, Tokyo",
  lat: 35.7148231,
  lng: 139.7967412,
};

describe("the Google Maps link", () => {
  it("asks for the place by name and address, so Google finds its own listing", () => {
    const url = new URL(googleMapsUrl(place));

    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("query")).toBe("Fuglen Asakusa, 2-6-15 Asakusa, Taito City, Tokyo");
  });

  it("falls back to the coordinate for a pin dropped by hand", () => {
    /* No address means nobody looked this up — the name is whatever was typed,
       and Google has never heard of it. */
    const url = new URL(googleMapsUrl({ ...place, name: "That viewpoint", address: "" }));

    expect(url.searchParams.get("query")).toBe("35.7148231,139.7967412");
  });

  it("escapes a name that would otherwise break the query", () => {
    const url = new URL(googleMapsUrl({ ...place, name: "Tea & Cake #2" }));

    expect(url.searchParams.get("query")).toContain("Tea & Cake #2");
    expect(googleMapsUrl({ ...place, name: "Tea & Cake #2" })).toContain("%26");
  });
});

describe("spotting a link that came out of Google Maps", () => {
  it("knows the shapes Google shares", () => {
    expect(looksLikeMapsLink("https://maps.app.goo.gl/aB3xY9")).toBe(true);
    expect(looksLikeMapsLink("https://www.google.com/maps/place/Fuglen/@35.7,139.7,17z")).toBe(true);
    expect(looksLikeMapsLink("google.com/maps/place/Fuglen/@35.7,139.7,17z")).toBe(true);
    expect(looksLikeMapsLink("https://goo.gl/maps/aB3xY9")).toBe(true);
  });

  it("leaves ordinary searching alone", () => {
    /* This is what decides whether a typed line is a link to resolve or words
       to search for, so a place named after a street must not look like one. */
    expect(looksLikeMapsLink("fuglen asakusa")).toBe(false);
    expect(looksLikeMapsLink("https://instagram.com/fuglen.coffee")).toBe(false);
    expect(looksLikeMapsLink("")).toBe(false);
  });
});
