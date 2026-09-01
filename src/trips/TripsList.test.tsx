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
  archivedAt: null,
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
  fetchTrips: (options?: { archived?: boolean }) => fetchTrips(options),
}));

vi.mock("../lib/api/invitations", () => ({
  fetchMyInvitations: () => fetchMyInvitations(),
  acceptInvitation: (id: number) => acceptInvitation(id),
  declineInvitation: (id: number) => declineInvitation(id),
}));

/* The digest the list watches, under the test's control; `useChanged` stays
   real. See the same shape in TripDetail.test.tsx. */
const live = vi.hoisted(() => ({
  current: null as { trips: Record<number, number>; invitations: { count: number; latest: number | null } } | null,
}));

vi.mock("../live/useLiveUpdates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../live/useLiveUpdates")>()),
  useLiveUpdates: () => ({ updates: live.current, refresh: vi.fn() }),
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
  archived = [];
  fetchMyInvitations.mockReset().mockResolvedValue([]);
  acceptInvitation.mockReset().mockResolvedValue(3);
  declineInvitation.mockReset().mockResolvedValue(undefined);
  live.current = { trips: { 1: 100 }, invitations: { count: 0, latest: null } };
});

/** How many times the *main* list has been asked for. The archive rides
    along on every reload, and counting both would turn these assertions about
    when the list refreshes into assertions about how many calls that takes. */
const listFetches = () =>
  fetchTrips.mock.calls.filter(([options]) => !options?.archived).length;

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
    expect(listFetches()).toBe(2);
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it("declines, and the card goes without touching the trips", async () => {
    const user = userEvent.setup();
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    open();

    await user.click(await screen.findByRole("button", { name: /decline/i }));

    expect(declineInvitation).toHaveBeenCalledWith(7);
    expect(listFetches()).toBe(1);
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


describe("keeping the list current", () => {
  /* A function, not a constant: React bails out of re-rendering when handed
     back the identical element object. */
  const tree = () => (
    <MemoryRouter>
      <TripsList />
    </MemoryRouter>
  );

  it("shows an invitation that arrives while you are looking at the list", async () => {
    const { rerender } = render(tree());
    await screen.findByRole("heading", { name: "Your trips" });
    expect(screen.queryByText("Japan 2026")).not.toBeInTheDocument();

    // Somebody invites you. Nothing is emailed; this is how you find out.
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    live.current = { trips: { 1: 100 }, invitations: { count: 1, latest: 200 } };
    rerender(tree());

    expect(await screen.findByText("Japan 2026")).toBeInTheDocument();
    expect(await screen.findByText(/Glee Earl invited you/)).toBeInTheDocument();
  });

  it("notices an invitation being taken back, which leaves the stamp alone", async () => {
    fetchMyInvitations.mockResolvedValue([INVITATION]);
    const { rerender } = render(tree());
    await screen.findByText("Japan 2026");
    expect(fetchMyInvitations).toHaveBeenCalledTimes(1);

    /* The case the count is there for: revoking the older of two invitations
       leaves `latest` exactly where it was, and a stamp alone would say
       nothing had happened. */
    fetchMyInvitations.mockResolvedValue([]);
    live.current = { trips: { 1: 100 }, invitations: { count: 0, latest: 200 } };
    rerender(tree());

    await vi.waitFor(() => expect(fetchMyInvitations).toHaveBeenCalledTimes(2));
  });

  it("picks up a trip someone else renamed", async () => {
    fetchTrips.mockResolvedValue([trip({ id: 1, name: "Japan 2026" })]);
    const { rerender } = render(tree());
    await screen.findByText("Japan 2026");

    fetchTrips.mockResolvedValue([trip({ id: 1, name: "Japan, later" })]);
    live.current = { trips: { 1: 200 }, invitations: { count: 0, latest: null } };
    rerender(tree());

    expect(await screen.findByText("Japan, later")).toBeInTheDocument();
  });

  it("picks up a trip you have just been added to", async () => {
    const { rerender } = render(tree());
    await screen.findByRole("heading", { name: "Your trips" });

    /* A trip arriving is a key appearing, not a stamp moving — which is why the
       ids are folded into what the list watches. */
    fetchTrips.mockResolvedValue([trip({ id: 2, name: "Lisbon" })]);
    live.current = { trips: { 1: 100, 2: 300 }, invitations: { count: 0, latest: null } };
    rerender(tree());

    expect(await screen.findByText("Lisbon")).toBeInTheDocument();
  });

  it("asks for nothing while nothing has moved", async () => {
    const { rerender } = render(tree());
    await screen.findByRole("heading", { name: "Your trips" });
    expect(listFetches()).toBe(1);

    live.current = { trips: { 1: 100 }, invitations: { count: 0, latest: null } };
    rerender(tree());

    expect(listFetches()).toBe(1);
    expect(fetchMyInvitations).toHaveBeenCalledTimes(1);
  });
});


/* ── The archive ────────────────────────────────────────────────────── */

let archived: Trip[] = [];

/** Answers the active list from `live`, and the archived one from `archived`. */
const withArchive = (active: Trip[]) =>
  fetchTrips.mockImplementation((options?: { archived?: boolean }) =>
    Promise.resolve(options?.archived ? archived : active),
  );

describe("archived trips", () => {
  it("says nothing at all when nothing has been archived", async () => {
    withArchive([trip({ id: 1, name: "Japan 2026" })]);
    open();

    await screen.findByText("Japan 2026");

    expect(screen.queryByRole("button", { name: /archived/i })).not.toBeInTheDocument();
  });

  it("keeps them out of the main list, behind a count", async () => {
    archived = [trip({ id: 2, name: "Lisbon 2019", archivedAt: "2026-09-01T10:00:00+00:00" })];
    withArchive([trip({ id: 1, name: "Japan 2026" })]);
    open();

    await screen.findByText("Japan 2026");

    /* Filed away means out of sight until asked for — a section that showed
       them by default would be the same list with a new heading. */
    expect(screen.queryByText("Lisbon 2019")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /archived \(1\)/i })).toBeInTheDocument();
  });

  it("shows them when the section is opened", async () => {
    const user = userEvent.setup();
    archived = [trip({ id: 2, name: "Lisbon 2019", archivedAt: "2026-09-01T10:00:00+00:00" })];
    withArchive([]);
    open();

    await user.click(await screen.findByRole("button", { name: /archived \(1\)/i }));

    expect(screen.getByText("Lisbon 2019")).toBeInTheDocument();
  });

  it("does not sort an archived trip into upcoming or past", async () => {
    /* Filed away is not a date question: a finished trip that was archived
       belongs in the archive, not in "been there" as well. */
    const user = userEvent.setup();
    archived = [trip({ id: 2, name: "Lisbon 2019", startDate: "2019-05-01", endDate: "2019-05-08" })];
    withArchive([]);
    open();

    await user.click(await screen.findByRole("button", { name: /archived \(1\)/i }));

    expect(screen.queryByRole("heading", { name: "Been there" })).not.toBeInTheDocument();
  });

  it("does not count an empty active list as having no trips at all", async () => {
    /* The empty state offers to start your first trip. Somebody with ten
       archived trips has not got none. */
    archived = [trip({ id: 2, name: "Lisbon 2019" })];
    withArchive([]);
    open();

    await screen.findByRole("button", { name: /archived \(1\)/i });

    expect(screen.queryByText(/Nothing planned yet/)).not.toBeInTheDocument();
  });
});
