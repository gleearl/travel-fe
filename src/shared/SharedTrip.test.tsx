import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api/http";
import type { Place, User } from "../lib/api/types";
import type { SharedTrip as Shared } from "../lib/api/sharing";
import { SharedTrip } from "./SharedTrip";

const api = vi.hoisted(() => ({ fetch: vi.fn(), join: vi.fn(), copy: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as User | null }));

vi.mock("../lib/api/sharing", () => ({
  fetchSharedTrip: (token: string) => api.fetch(token),
  joinSharedTrip: (token: string) => api.join(token),
  copySharedTrip: (token: string) => api.copy(token),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: auth.user, status: "ready", signOut: vi.fn() }),
}));

// The map is WebGL; these tests are about the page around it.
vi.mock("../trip/TripMap", () => ({ TripMap: () => <div data-testid="map" /> }));

const place = (over: Partial<Place>): Place => ({
  id: 1, tripId: 7, name: "Somewhere", address: "", lat: 25, lng: 121, category: "food", tags: [],
  link: "", notes: "", visited: false, position: 1, addedBy: null, ...over,
});

const TRIP: Shared = {
  name: "Taipei 2026",
  destination: "Taipei",
  destinationLat: 25.04,
  destinationLng: 121.56,
  startDate: "2026-11-12",
  endDate: "2026-11-18",
  owner: { id: 9, name: "Glee Earl" },
  shareRole: "editor",
  yourRole: null,
  tripId: null,
  kinds: [],
  places: [
    place({ id: 1, name: "Raohe Night Market", tags: ["Street food"], notes: "pepper buns" }),
    place({ id: 2, name: "Elephant Mountain", category: "sight" }),
  ],
};

/** Shows where the page sent us, and with what. */
function Landed() {
  const location = useLocation();
  return <p data-testid="landed">{location.pathname + " " + JSON.stringify(location.state ?? null)}</p>;
}

function open(path = "/s/tok123") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/s/:token" element={<SharedTrip />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
  api.fetch.mockReset().mockResolvedValue(structuredClone(TRIP));
  api.join.mockReset().mockResolvedValue(7);
  api.copy.mockReset().mockResolvedValue(42);
});

describe("a trip opened from its share link", () => {
  it("shows the whole trip to someone without an account", async () => {
    open();

    expect(await screen.findByRole("heading", { name: "Taipei 2026" })).toBeInTheDocument();
    expect(screen.getByText("Shared by Glee Earl")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Raohe Night Market" })).toBeInTheDocument();
    expect(screen.getByText(/pepper buns/)).toBeInTheDocument();
    expect(api.fetch).toHaveBeenCalledWith("tok123");
  });

  it("lets them open a place in full, with nothing to edit", async () => {
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole("button", { name: "View Raohe Night Market" }));

    const sheet = screen.getByRole("dialog", { name: "Raohe Night Market" });
    expect(within(sheet).getByText("Street food")).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("says what joining means for this link", async () => {
    open();

    expect(await screen.findByText(/Join to plan it with Glee Earl/)).toBeInTheDocument();
  });

  it("sends someone without an account to sign up, and remembers what they chose", async () => {
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole("button", { name: "Copy to my trips" }));

    expect(screen.getByTestId("landed")).toHaveTextContent('/sign-up {"from":"/s/tok123?then=copy"}');
    expect(api.copy).not.toHaveBeenCalled();
  });

  it("joins straight away for someone signed in, and opens the trip", async () => {
    const user = userEvent.setup();
    auth.user = { id: 3, name: "Ana", email: "ana@example.com" };
    open();

    await user.click(await screen.findByRole("button", { name: "Join this trip" }));

    expect(api.join).toHaveBeenCalledWith("tok123");
    expect(screen.getByTestId("landed")).toHaveTextContent("/trips/7");
  });

  it("finishes the copy once they come back signed in", async () => {
    auth.user = { id: 3, name: "Ana", email: "ana@example.com" };
    open("/s/tok123?then=copy");

    expect(await screen.findByTestId("landed")).toHaveTextContent("/trips/42");
    expect(api.copy).toHaveBeenCalledTimes(1);
  });

  it("offers to open the trip to someone already on it", async () => {
    const user = userEvent.setup();
    auth.user = { id: 3, name: "Ana", email: "ana@example.com" };
    api.fetch.mockResolvedValue({ ...structuredClone(TRIP), yourRole: "viewer", tripId: 7 });
    open();

    expect(await screen.findByText("You’re already on this trip.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join this trip" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open trip" }));
    expect(screen.getByTestId("landed")).toHaveTextContent("/trips/7");
  });

  it("says so plainly when the link has been turned off", async () => {
    api.fetch.mockRejectedValue(new ApiError(404, "Not found"));
    open();

    expect(await screen.findByRole("heading", { name: "This link doesn’t work any more" })).toBeInTheDocument();
  });
});
