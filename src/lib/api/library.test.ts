import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken } from "./http";
import { searchLibrary } from "./library";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearToken();
  fetchMock = vi.fn().mockResolvedValue(json({ data: [] }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("places you have saved before", () => {
  const RAW = {
    name: "Fuglen Asakusa",
    address: "2-6-15 Asakusa, Taito City",
    lat: "35.7148231",
    lng: "139.7967412",
    category: "cafe",
    link: "https://instagram.com/fuglen.coffee",
    notes: "go early, the honey toast sells out",
    trip_name: "Japan 2026",
  };

  it("brings back everything the form needs to fill itself in", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [RAW] }));

    expect(await searchLibrary("fuglen")).toEqual([
      {
        name: "Fuglen Asakusa",
        address: "2-6-15 Asakusa, Taito City",
        lat: 35.7148231,
        lng: 139.7967412,
        category: "cafe",
        link: "https://instagram.com/fuglen.coffee",
        notes: "go early, the honey toast sells out",
        tripName: "Japan 2026",
      },
    ]);
  });

  it("turns the coordinate strings into numbers the map can use", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [RAW] }));

    const [place] = await searchLibrary("fuglen");

    expect(place.lat).toBeCloseTo(35.7148231, 7);
    expect(place.lng).toBeCloseTo(139.7967412, 7);
  });

  it("escapes the query rather than pasting it into a URL", async () => {
    await searchLibrary("100% chocolate & co");

    const [url] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/places/library");
    expect(url).toContain("q=100%25%20chocolate%20%26%20co");
  });

  it("falls back to 'other' rather than a chip with no colour", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ ...RAW, category: "nightclub" }] }));

    expect((await searchLibrary("fuglen"))[0].category).toBe("other");
  });

  it("copes with a saved place that has no notes, link or address", async () => {
    /* A pin dropped on a street corner and never written up. It is still worth
       offering — the point is where it was. */
    fetchMock.mockResolvedValueOnce(
      json({ data: [{ name: "That viewpoint", lat: "35.6", lng: "139.7", category: "sight" }] }),
    );

    const [place] = await searchLibrary("viewpoint");

    expect(place).toMatchObject({ address: "", link: "", notes: "", tripName: "" });
  });
});
