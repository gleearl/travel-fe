import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "../lib/api/types";
import { TripForm } from "./TripForm";

const archiveTrip = vi.fn();
const unarchiveTrip = vi.fn();
const deleteTrip = vi.fn();

vi.mock("../lib/api/trips", () => ({
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  archiveTrip: (id: number) => archiveTrip(id),
  unarchiveTrip: (id: number) => unarchiveTrip(id),
  deleteTrip: (id: number) => deleteTrip(id),
}));

vi.mock("../lib/api/geocode", () => ({ searchPlaces: vi.fn().mockResolvedValue([]) }));

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 4,
  name: "Japan 2026",
  destination: "Tokyo, Japan",
  destinationLat: null,
  destinationLng: null,
  startDate: null,
  endDate: null,
  archivedAt: null,
  placeCount: 14,
  role: "owner",
  owner: null,
  collaborators: [],
  places: [],
  ...over,
});

const noop = () => undefined;

const open = (over: Partial<Trip> = {}, props: Partial<Parameters<typeof TripForm>[0]> = {}) =>
  render(
    <TripForm
      trip={trip(over)}
      onClose={noop}
      onSaved={noop}
      onArchived={noop}
      onDeleted={noop}
      {...props}
    />,
  );

beforeEach(() => {
  archiveTrip.mockReset().mockResolvedValue(undefined);
  unarchiveTrip.mockReset().mockResolvedValue(undefined);
  deleteTrip.mockReset().mockResolvedValue(undefined);
});

describe("the danger row on an existing trip", () => {
  it("archives, and hands the trip back to whoever opened the form", async () => {
    const user = userEvent.setup();
    const onArchived = vi.fn();
    open({}, { onArchived });

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(archiveTrip).toHaveBeenCalledWith(4);
    expect(onArchived).toHaveBeenCalled();
  });

  it("offers to restore an archived trip instead of archiving it again", async () => {
    const user = userEvent.setup();
    open({ archivedAt: "2026-09-01T10:00:00+00:00" });

    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(unarchiveTrip).toHaveBeenCalledWith(4);
  });

  it("does not delete on the first tap", async () => {
    /* A trip takes its places, its people and its invitations with it, and
       there is no undo. One stray tap must not be enough. */
    const user = userEvent.setup();
    open();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteTrip).not.toHaveBeenCalled();
  });

  it("says what is about to go, and deletes on the second tap", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    open({}, { onDeleted });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("button", { name: /really delete/i });
    expect(confirm).toHaveTextContent("14 places");

    await user.click(confirm);

    expect(deleteTrip).toHaveBeenCalledWith(4);
    expect(onDeleted).toHaveBeenCalled();
  });

  it("counts the places it can see when the trip carries them", async () => {
    /* The detail screen loads the places themselves and never asks for a
       count — `place_count` is `whenCounted` and rides along on the list
       only — so the trip this sheet is opened from reports zero of them.
       Reading placeCount alone would promise to delete "0 places" while
       three sit on the screen behind the sheet. */
    const user = userEvent.setup();
    open({
      placeCount: 0,
      places: [{ id: 1 }, { id: 2 }, { id: 3 }] as Trip["places"],
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: /really delete/i })).toHaveTextContent("3 places");
  });

  it("falls back to the count when the trip carries no places, as on the list", async () => {
    const user = userEvent.setup();
    open({ placeCount: 14, places: [] });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: /really delete/i })).toHaveTextContent("14 places");
  });

  it("shows neither to somebody who is only on the trip", async () => {
    /* Archiving and deleting are the owner's alone; an editor who wants it
       off their list leaves the trip from the people sheet. */
    open({ role: "editor" });

    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("is absent entirely on a trip that does not exist yet", () => {
    render(<TripForm onClose={noop} onSaved={noop} />);

    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
