import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/useAuth";
import type { Place, Trip } from "../lib/api/types";
import { TripDetail } from "./TripDetail";

const place = (over: Partial<Place>): Place => ({
  id: 1,
  tripId: 7,
  name: "Somewhere",
  address: "",
  lat: 35.7,
  lng: 139.8,
  category: "other",
  link: "",
  notes: "",
  visited: false,
  position: 1,
  ...over,
});

const TRIP: Trip = {
  id: 7,
  name: "Japan 2026",
  destination: "Tokyo, Japan",
  destinationLat: 35.68,
  destinationLng: 139.76,
  startDate: "2026-03-04",
  endDate: "2026-03-18",
  placeCount: 3,
  places: [
    place({ id: 1, name: "Fuglen Asakusa", category: "cafe", notes: "try the honey toast" }),
    place({ id: 2, name: "teamLab Borderless", category: "sight", visited: true }),
    place({ id: 3, name: "Ichiran", category: "food" }),
  ],
};

const fetchTrip = vi.fn();
const updatePlace = vi.fn();

vi.mock("../lib/api/trips", () => ({
  fetchTrip: (id: number) => fetchTrip(id),
  updateTrip: vi.fn(),
  createTrip: vi.fn(),
}));

vi.mock("../lib/api/places", () => ({
  updatePlace: (id: number, input: unknown) => updatePlace(id, input),
  createPlace: vi.fn(),
  deletePlace: vi.fn(),
}));

function open() {
  render(
    <MemoryRouter initialEntries={["/trips/7"]}>
      <AuthProvider>
        <Routes>
          <Route path="/trips/:id" element={<TripDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchTrip.mockReset().mockResolvedValue(structuredClone(TRIP));
  updatePlace.mockReset().mockImplementation((id, input) => Promise.resolve({ ...input, id }));
});

describe("the trip screen", () => {
  it("shows the trip and every place on it", async () => {
    open();

    expect(await screen.findByRole("heading", { name: "Japan 2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fuglen Asakusa" })).toBeInTheDocument();
    expect(screen.getByText(/try the honey toast/)).toBeInTheDocument();
    expect(screen.getByText("Mar 4 — 18")).toBeInTheDocument();
  });

  it("says how many places, and how many have been seen", async () => {
    open();

    expect(await screen.findByText("3 places")).toBeInTheDocument();
    expect(screen.getByText("1 seen")).toBeInTheDocument();
  });

  it("filters the list down to one kind, and back", async () => {
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole("button", { name: /^Cafe/ }));

    expect(screen.getByRole("heading", { name: "Fuglen Asakusa" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ichiran" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Cafe/ }));

    expect(screen.getByRole("heading", { name: "Ichiran" })).toBeInTheDocument();
  });

  it("only offers filters for kinds this trip actually has", async () => {
    open();
    await screen.findByRole("heading", { name: "Japan 2026" });

    expect(screen.queryByRole("button", { name: /^Shopping/ })).not.toBeInTheDocument();
  });

  it("marks a place seen straight away, without waiting for the server", async () => {
    const user = userEvent.setup();
    /* A promise that never settles: whatever is on screen after this is what
       the optimistic update put there. */
    updatePlace.mockImplementation(() => new Promise(() => {}));
    open();

    const card = (await screen.findByRole("heading", { name: "Ichiran" })).closest("li")!;
    await user.click(within(card).getByRole("button", { name: "Been" }));

    expect(within(card).getByRole("button", { name: "Not yet" })).toBeInTheDocument();
    expect(updatePlace).toHaveBeenCalledWith(3, expect.objectContaining({ visited: true }));
  });

  it("puts a place back the way it was when the server refuses", async () => {
    const user = userEvent.setup();
    updatePlace.mockRejectedValue(new Error("offline"));
    open();

    const card = (await screen.findByRole("heading", { name: "Ichiran" })).closest("li")!;
    await user.click(within(card).getByRole("button", { name: "Been" }));

    expect(await within(card).findByRole("button", { name: "Been" })).toBeInTheDocument();
  });

  it("selects the matching card when its pin is pressed", async () => {
    const user = userEvent.setup();
    open();
    await screen.findByRole("heading", { name: "Japan 2026" });

    const pin = screen.getAllByTestId("pin").find((p) => p.dataset.title === "Ichiran")!;
    await user.click(pin);

    const card = screen.getByRole("heading", { name: "Ichiran" }).closest("li")!;
    expect(within(card).getByRole("button", { current: true })).toBeInTheDocument();
  });

  it("says so plainly when the trip can't be loaded", async () => {
    fetchTrip.mockRejectedValue(new Error("nope"));
    open();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't open that trip.");
  });
});
