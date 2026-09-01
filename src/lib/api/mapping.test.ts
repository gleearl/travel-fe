import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./geocode";
import { clearToken } from "./http";
import { createPlace } from "./places";
import { fetchTrip, fetchTrips } from "./trips";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearToken();
  fetchMock = vi.fn().mockResolvedValue(json({ data: [] }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("trips", () => {
  it("takes Laravel's snake_case and gives the app camelCase", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: [
          {
            id: 3,
            name: "Japan 2026",
            destination: "Tokyo, Japan",
            destination_lat: "35.6812000",
            destination_lng: "139.7671000",
            start_date: "2026-03-04",
            end_date: "2026-03-18",
            place_count: 14,
          },
        ],
      }),
    );

    const [trip] = await fetchTrips();

    expect(trip).toEqual({
      id: 3,
      name: "Japan 2026",
      destination: "Tokyo, Japan",
      destinationLat: 35.6812,
      destinationLng: 139.7671,
      startDate: "2026-03-04",
      endDate: "2026-03-18",
      archivedAt: null,
      placeCount: 14,
      role: "owner",
      owner: null,
      collaborators: [],
      places: [],
    });
  });

  it("carries the archive stamp through when the trip has been filed away", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { id: 1, name: "Lisbon 2019", archived_at: "2026-09-01T10:00:00+00:00" } }),
    );

    expect((await fetchTrip(1)).archivedAt).toBe("2026-09-01T10:00:00+00:00");
  });

  it("reads a trip with no destination or dates without inventing any", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { id: 1, name: "Someday", destination: null, destination_lat: null, start_date: null } }),
    );

    const trip = await fetchTrip(1);

    expect(trip.destination).toBe("");
    expect(trip.destinationLat).toBeNull();
    expect(trip.startDate).toBeNull();
  });

  it("turns the coordinate strings into numbers the map can use", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: {
          id: 1,
          name: "Japan",
          places: [{ id: 9, trip_id: 1, name: "Fuglen", lat: "35.7148231", lng: "139.7967412" }],
        },
      }),
    );

    const [place] = (await fetchTrip(1)).places;

    expect(place.lat).toBeCloseTo(35.7148231, 7);
    expect(place.lng).toBeCloseTo(139.7967412, 7);
  });

  it("falls back to 'other' rather than a pin with no colour", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { id: 1, places: [{ id: 9, lat: "1", lng: "1", category: "nightclub" }] } }),
    );

    expect((await fetchTrip(1)).places[0].category).toBe("other");
  });
});

describe("writes", () => {
  it("sends an empty optional field as null, not as an empty string", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { id: 1, lat: "1", lng: "1" } }));

    await createPlace(3, {
      name: "Pin",
      address: "",
      lat: 1,
      lng: 1,
      category: "other",
      link: "",
      notes: "",
      visited: false,
    });

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/trips/3/places");
    expect(JSON.parse(init.body)).toMatchObject({ address: null, link: null, notes: null });
  });
});

describe("geocoding", () => {
  it("escapes the query rather than pasting it into a URL", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [] }));

    await searchPlaces("fuglen asakusa & co");

    const [url] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("q=fuglen%20asakusa%20%26%20co");
  });

  it("hands back something ready to become a place", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: [{ name: "Fuglen Asakusa", address: "2-6-15 Asakusa", lat: 35.7148, lng: 139.7967 }] }),
    );

    expect(await searchPlaces("fuglen")).toEqual([
      { name: "Fuglen Asakusa", address: "2-6-15 Asakusa", lat: 35.7148, lng: 139.7967 },
    ]);
  });
});

describe("sharing", () => {
  it("carries the role the server gave, so the UI never has to infer it", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { id: 1, name: "Japan", role: "viewer", owner: { id: 4, name: "Ana Lopez" } } }),
    );

    const trip = await fetchTrip(1);

    expect(trip.role).toBe("viewer");
    expect(trip.owner).toEqual({ id: 4, name: "Ana Lopez" });
  });

  it("reads the people on a trip", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: {
          id: 1,
          name: "Japan",
          role: "owner",
          collaborators: [
            { id: 4, name: "Ana Lopez", role: "editor" },
            { id: 5, name: "Bo Chen", role: "viewer" },
          ],
        },
      }),
    );

    const trip = await fetchTrip(1);

    expect(trip.collaborators).toHaveLength(2);
    expect(trip.collaborators[1]).toEqual({ id: 5, name: "Bo Chen", role: "viewer" });
  });

  it("treats a trip from before sharing existed as one you own alone", async () => {
    /* An older build, or a response that predates the feature: no role, nobody
       on it. Guessing "viewer" would lock the owner out of their own trip. */
    fetchMock.mockResolvedValueOnce(json({ data: { id: 1, name: "Japan" } }));

    const trip = await fetchTrip(1);

    expect(trip.role).toBe("owner");
    expect(trip.collaborators).toEqual([]);
    expect(trip.owner).toBeNull();
  });

  it("reads who added a place, and copes with nobody having", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: {
          id: 1,
          places: [
            { id: 9, lat: "1", lng: "1", added_by: { id: 4, name: "Ana Lopez" } },
            { id: 10, lat: "2", lng: "2", added_by: null },
          ],
        },
      }),
    );

    const [first, second] = (await fetchTrip(1)).places;

    expect(first.addedBy).toEqual({ id: 4, name: "Ana Lopez" });
    expect(second.addedBy).toBeNull();
  });

  it("falls back to viewer for a role it has never heard of", async () => {
    /* The safe direction: a role this build does not know must not be read as
       permission to change things. */
    fetchMock.mockResolvedValueOnce(json({ data: { id: 1, name: "Japan", role: "administrator" } }));

    expect((await fetchTrip(1)).role).toBe("viewer");
  });
});
