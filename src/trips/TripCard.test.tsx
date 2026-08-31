import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Trip } from "../lib/api/types";
import { TripCard } from "./TripCard";

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 1,
  name: "Japan 2026",
  destination: "Tokyo, Japan",
  destinationLat: null,
  destinationLng: null,
  startDate: "2026-03-04",
  endDate: "2026-03-18",
  placeCount: 14,
  role: "owner",
  owner: { id: 9, name: "Glee Earl" },
  collaborators: [],
  places: [],
  ...over,
});

const show = (over: Partial<Trip> = {}) =>
  render(
    <MemoryRouter>
      <TripCard trip={trip(over)} index={0} />
    </MemoryRouter>,
  );

describe("a trip card", () => {
  it("says nothing about sharing on a trip you keep alone", () => {
    /* Most trips have one person on them. A card that announced that would be
       noise on every row of the list. */
    show();

    expect(screen.queryByText(/shared by/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/on this trip/i)).not.toBeInTheDocument();
  });

  it("names whoever shared a trip that is not yours", () => {
    show({ role: "editor", owner: { id: 9, name: "Ana Lopez" } });

    expect(screen.getByText("Shared by Ana Lopez")).toBeInTheDocument();
  });

  it("draws the people on a trip you share with somebody", () => {
    show({ collaborators: [{ id: 4, name: "Ana Lopez", role: "editor" }] });

    const stack = screen.getByLabelText("2 people on this trip");

    expect(stack).toBeInTheDocument();
    expect(screen.getByText("GE")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("marks a trip you can only look at", () => {
    show({ role: "viewer", owner: { id: 9, name: "Ana Lopez" } });

    expect(screen.getByText("View only")).toBeInTheDocument();
  });

  it("still shows the dates and the count it always did", () => {
    show({ role: "viewer", owner: { id: 9, name: "Ana Lopez" } });

    expect(screen.getByText("Mar 4 — 18")).toBeInTheDocument();
    expect(screen.getByText("14 places")).toBeInTheDocument();
  });
});
