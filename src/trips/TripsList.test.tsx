import { describe, expect, it } from "vitest";
import type { Trip } from "../lib/api/types";
import { split } from "./TripsList";

const trip = (over: Partial<Trip>): Trip => ({
  id: 1,
  name: "Trip",
  destination: "",
  destinationLat: null,
  destinationLng: null,
  startDate: null,
  endDate: null,
  placeCount: 0,
  role: "owner",
  owner: null,
  collaborators: [],
  places: [],
  ...over,
});

describe("upcoming and past", () => {
  it("keeps a trip in the upcoming list on its final day", () => {
    /* You are still on a trip on the morning it ends; moving it to "been
       there" while you are standing in the city would be wrong. */
    /* Built in local time, because that is what split reads the clock in.
       toISOString would give UTC, which is a different day for a good part of
       every day, and the test would fail for a few hours at a time. */
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const { upcoming, past } = split([trip({ id: 1, startDate: "2020-01-01", endDate: today })]);

    expect(upcoming.map((t) => t.id)).toEqual([1]);
    expect(past).toHaveLength(0);
  });

  it("puts a finished trip in the past", () => {
    const { upcoming, past } = split([trip({ id: 2, startDate: "2020-01-01", endDate: "2020-01-08" })]);

    expect(past.map((t) => t.id)).toEqual([2]);
    expect(upcoming).toHaveLength(0);
  });

  it("treats a trip with no dates as a plan, not as history", () => {
    const { upcoming, past } = split([trip({ id: 3 })]);

    expect(upcoming.map((t) => t.id)).toEqual([3]);
    expect(past).toHaveLength(0);
  });

  it("falls back to the start date when a trip has no end", () => {
    const { past } = split([trip({ id: 4, startDate: "2019-05-01", endDate: null })]);
    expect(past.map((t) => t.id)).toEqual([4]);
  });
});
