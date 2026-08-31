import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "../lib/api/types";
import { split, TripsList } from "./TripsList";

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

/* ── Invitations waiting on you ─────────────────────────────────────── */

const fetchTrips = vi.fn();
const fetchMyInvitations = vi.fn();
const acceptInvitation = vi.fn();
const declineInvitation = vi.fn();

vi.mock("../lib/api/trips", () => ({
  fetchTrips: () => fetchTrips(),
}));

vi.mock("../lib/api/invitations", () => ({
  fetchMyInvitations: () => fetchMyInvitations(),
  acceptInvitation: (id: number) => acceptInvitation(id),
  declineInvitation: (id: number) => declineInvitation(id),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Ana Lopez", email: "ana@example.test" }, signOut: vi.fn() }),
}));

const INVITATION = {
  id: 7,
  role: "editor" as const,
  invitedBy: { id: 9, name: "Glee Earl" },
  trip: { id: 3, name: "Japan 2026", destination: "Tokyo, Japan", startDate: "2026-03-04", endDate: "2026-03-18" },
};

beforeEach(() => {
  fetchTrips.mockReset().mockResolvedValue([]);
  fetchMyInvitations.mockReset().mockResolvedValue([]);
  acceptInvitation.mockReset().mockResolvedValue(3);
  declineInvitation.mockReset().mockResolvedValue(undefined);
});

const open = () =>
  render(
    <MemoryRouter>
      <TripsList />
    </MemoryRouter>,
  );

describe("an invitation waiting on you", () => {
  it("says which trip, and who asked", async () => {
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    open();

    const card = (await screen.findByText("Japan 2026")).closest("li")!;

    expect(within(card).getByText(/Glee Earl invited you/)).toBeInTheDocument();
    expect(within(card).getByText("Mar 4 — 18")).toBeInTheDocument();
  });

  it("is not a link into the trip, because you cannot open it yet", async () => {
    /* Accepting is what grants access; a card that looked pressable would
       lead straight to a 404. */
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    open();

    const card = (await screen.findByText("Japan 2026")).closest("li")!;

    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });

  it("says nothing at all when nothing is waiting", async () => {
    open();

    await screen.findByRole("heading", { name: "Your trips" });

    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it("accepts, and the trip arrives in the list", async () => {
    const user = userEvent.setup();
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    open();

    await user.click(await screen.findByRole("button", { name: /accept/i }));

    expect(acceptInvitation).toHaveBeenCalledWith(7);
    /* The list is asked again rather than patched by hand: the trip arrives
       with its places count, its people and our role already on it. */
    expect(fetchTrips).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it("declines, and the card goes without touching the trips", async () => {
    const user = userEvent.setup();
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    open();

    await user.click(await screen.findByRole("button", { name: /decline/i }));

    expect(declineInvitation).toHaveBeenCalledWith(7);
    expect(fetchTrips).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it("keeps the card when the server refuses", async () => {
    const user = userEvent.setup();
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    acceptInvitation.mockRejectedValue(new Error("offline"));
    open();

    await user.click(await screen.findByRole("button", { name: /accept/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/invited you/)).toBeInTheDocument();
  });
});
