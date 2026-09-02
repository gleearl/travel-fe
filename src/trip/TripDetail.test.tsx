import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/useAuth";
import { ApiError } from "../lib/api/http";
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
  addedBy: null,
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
  archivedAt: null,
  placeCount: 3,
  role: "owner",
  owner: { id: 99, name: "Glee Earl" },
  collaborators: [],
  places: [
    place({
      id: 1,
      name: "Fuglen Asakusa",
      address: "2-6-15 Asakusa, Taito City",
      category: "cafe",
      link: "https://instagram.com/p/abc123",
      notes: "try the honey toast",
    }),
    place({
      id: 2,
      name: "teamLab Borderless",
      category: "sight",
      visited: true,
      addedBy: { id: 4, name: "Ana Lopez" },
    }),
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

/* The map is WebGL and imperative DOM; jsdom has neither a GPU nor layout, and
   these tests are about the screen around it. Its own behaviour — tiles, the
   camera, the long press — is verified in a browser instead. The stub keeps
   the one thing the screen depends on: a pin per place that selects it. */
vi.mock("./TripMap", () => ({
  TripMap: ({
    places,
    onSelect,
    onDropPin,
  }: {
    places: { id: number; name: string }[];
    onSelect: (id: number) => void;
    onDropPin: (at: { lat: number; lng: number }) => void;
  }) => (
    <div data-testid="map">
      {places.map((place) => (
        <button key={place.id} data-testid="pin" data-title={place.name} onClick={() => onSelect(place.id)}>
          {place.name}
        </button>
      ))}
      {/* Stands in for the long press that drops a pin on open map. */}
      <button data-testid="drop-pin" onClick={() => onDropPin({ lat: 35.7, lng: 139.8 })}>
        drop a pin
      </button>
    </div>
  ),
  useDefaultPoint: () => ({ lat: 35.68, lng: 139.76 }),
}));

const searchPlaces = vi.fn();
const resolveMapLink = vi.fn();
const searchLibrary = vi.fn();

vi.mock("../lib/api/mapLink", () => ({
  resolveMapLink: (url: string) => resolveMapLink(url),
}));

vi.mock("../lib/api/geocode", () => ({
  searchPlaces: (query: string) => searchPlaces(query),
}));

vi.mock("../lib/api/library", () => ({
  searchLibrary: (query: string) => searchLibrary(query),
}));

const fetchMembers = vi.fn();

vi.mock("../lib/api/members", () => ({
  fetchMembers: (tripId: number) => fetchMembers(tripId),
  setMemberRole: vi.fn(),
  removeMember: vi.fn(),
  leaveTrip: vi.fn(),
}));

vi.mock("../lib/api/invitations", () => ({
  invite: vi.fn(),
  revokeInvitation: vi.fn(),
}));

/* Scrolling the selected card into view is geometry, and jsdom has none — the
   sums are covered in lib/reveal.test.ts. What matters here is that pressing a
   pin asks for the right card. */
const reveal = vi.hoisted(() => vi.fn());

vi.mock("../lib/reveal", () => ({ reveal }));

/* The digest the screen watches, under the test's control. `useChanged` is
   kept real — how a moved stamp turns into a refetch is the thing being
   tested. Held in a box via vi.hoisted because vi.mock is lifted above the
   imports and the factory must not read a variable that is not there yet. */
const live = vi.hoisted(() => ({
  current: null as { trips: Record<number, number>; invitations: { count: number; latest: number | null } } | null,
}));

vi.mock("../live/useLiveUpdates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../live/useLiveUpdates")>()),
  useLiveUpdates: () => ({ updates: live.current, refresh: vi.fn() }),
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
  searchPlaces.mockReset().mockResolvedValue([]);
  resolveMapLink.mockReset();
  searchLibrary.mockReset().mockResolvedValue([]);
  fetchMembers.mockReset().mockResolvedValue({
    owner: { id: 99, name: "Glee Earl", role: "owner" },
    members: [],
    invitations: [],
  });
  live.current = { trips: { 7: 100 }, invitations: { count: 0, latest: null } };
});

/** Opens the trip as somebody with the given role on it. */
function openAs(role: "owner" | "editor" | "viewer", over: Partial<Trip> = {}) {
  fetchTrip.mockResolvedValue({ ...structuredClone(TRIP), role, ...over });
  open();
}

/** Opens the add-place sheet and returns the search field inside it. */
async function openSearch(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Japan 2026" });
  await user.click(screen.getByRole("button", { name: "Add place" }));

  return screen.getByLabelText("Find it");
}

/* The one row in the "Saved before" list, found by the line naming the trip it
   came from. Deliberately not by its name: the same place is also a pin on the
   map behind the sheet and a card in the list, and all three say "Fuglen
   Asakusa" — which line tells them apart is exactly what the trip line is for. */
async function savedSuggestion(): Promise<HTMLElement> {
  return (await screen.findByText(`From ${SAVED.tripName}`)).closest("button")!;
}

const FUGLEN = {
  name: "Fuglen Asakusa",
  address: "Fuglen Asakusa, 2-6-15, Asakusa, Taito City, Tokyo",
  lat: 35.7148231,
  lng: 139.7967412,
};

/** The same place, as it comes back from an earlier trip. */
const SAVED = {
  name: "Fuglen Asakusa",
  address: "2-6-15 Asakusa, Taito City",
  lat: 35.7148231,
  lng: 139.7967412,
  category: "cafe" as const,
  link: "https://instagram.com/fuglen.coffee",
  notes: "go early, the honey toast sells out",
  tripName: "Japan 2024",
};

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

  it("scrolls the list to a card whose pin was pressed", async () => {
    const user = userEvent.setup();
    reveal.mockClear();
    open();
    await screen.findByRole("heading", { name: "Japan 2026" });

    await user.click(screen.getAllByTestId("pin").find((p) => p.dataset.title === "Ichiran")!);

    const card = screen.getByRole("heading", { name: "Ichiran" }).closest("li")!;
    expect(reveal).toHaveBeenLastCalledWith(card);
  });

  it("offers a way out to Google Maps for each place", async () => {
    open();

    const card = (await screen.findByRole("heading", { name: "Fuglen Asakusa" })).closest("li")!;
    const link = within(card).getByRole("link", { name: "Fuglen Asakusa in Google Maps" });

    expect(link).toHaveAttribute("href", expect.stringContaining("google.com/maps/search/"));
    expect(link).toHaveAttribute("href", expect.stringContaining("Fuglen%20Asakusa"));
  });

  it("links out to the post that put a place on the list", async () => {
    open();

    const card = (await screen.findByRole("heading", { name: "Fuglen Asakusa" })).closest("li")!;
    /* The link is an Instagram mark rather than a word, so its accessible name
       is the only thing that says where it goes. */
    const link = within(card).getByRole("link", { name: "Post about Fuglen Asakusa" });

    expect(link).toHaveAttribute("href", "https://instagram.com/p/abc123");
  });

  it("fills a place in from a Google Maps link pasted into the search box", async () => {
    const user = userEvent.setup();
    resolveMapLink.mockResolvedValue(FUGLEN);
    open();

    await user.type(await openSearch(user), "https://maps.app.goo.gl/aB3xY9");
    await user.click(screen.getByRole("button", { name: "Search" }));

    /* Straight into the form: a shared link names one place, so there is
       nothing to choose between. */
    expect(await screen.findByDisplayValue("Fuglen Asakusa")).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toHaveValue(FUGLEN.address);
    expect(screen.getByText(/Pin at 35.71482, 139.79674/)).toBeInTheDocument();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("still searches by name when what you typed is not a link", async () => {
    const user = userEvent.setup();
    open();

    await user.type(await openSearch(user), "fuglen asakusa");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(searchPlaces).toHaveBeenCalledWith("fuglen asakusa");
    expect(resolveMapLink).not.toHaveBeenCalled();
  });

  it("passes on what the server said when a link cannot be read", async () => {
    const user = userEvent.setup();
    resolveMapLink.mockRejectedValue(new ApiError(422, "That link doesn't point at a place.", {}));
    open();

    await user.type(await openSearch(user), "https://maps.app.goo.gl/aB3xY9");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That link doesn't point at a place.");
  });

  it("names a place after the Instagram account when the name is still empty", async () => {
    const user = userEvent.setup();
    open();
    await openSearch(user);

    await user.type(screen.getByLabelText("Link"), "instagram.com/fuglen.coffee");
    await user.tab();

    expect(screen.getByLabelText("Place")).toHaveValue("Fuglen Coffee");
  });

  it("gives a pasted link the scheme the server insists on", async () => {
    const user = userEvent.setup();
    open();
    await openSearch(user);

    /* Nobody copies the "https://" off a phone, and the API validates the link
       as a url, so without this a pasted account is refused on save. */
    await user.type(screen.getByLabelText("Link"), "instagram.com/fuglen.coffee");
    await user.tab();

    expect(screen.getByLabelText("Link")).toHaveValue("https://instagram.com/fuglen.coffee");
  });

  it("leaves a name you have already typed alone", async () => {
    const user = userEvent.setup();
    open();
    await openSearch(user);

    await user.type(screen.getByLabelText("Place"), "Fuglen, the good one");
    await user.type(screen.getByLabelText("Link"), "instagram.com/fuglen.coffee");
    await user.tab();

    expect(screen.getByLabelText("Place")).toHaveValue("Fuglen, the good one");
  });

  /* ── Places saved on an earlier trip ─────────────────────────────── */

  it("offers a place you saved before, as you type", async () => {
    const user = userEvent.setup();
    searchLibrary.mockResolvedValue([SAVED]);
    open();

    await user.type(await openSearch(user), "fugl");

    /* No button pressed. These come from our own database, so unlike the
       geocoder below they can answer while you are still typing. */
    expect(await screen.findByText("Saved before")).toBeInTheDocument();
    expect(screen.getByText("From Japan 2024")).toBeInTheDocument();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("fills the whole form from a saved place, notes and all", async () => {
    const user = userEvent.setup();
    searchLibrary.mockResolvedValue([SAVED]);
    open();

    await user.type(await openSearch(user), "fugl");
    await user.click(await savedSuggestion());

    /* The point of remembering a place is the part you wrote down about it —
       a name and a pin you could have found again yourself. */
    expect(screen.getByLabelText("Place")).toHaveValue("Fuglen Asakusa");
    expect(screen.getByLabelText("Address")).toHaveValue(SAVED.address);
    expect(screen.getByLabelText("Notes")).toHaveValue("go early, the honey toast sells out");
    expect(screen.getByLabelText("Link")).toHaveValue("https://instagram.com/fuglen.coffee");
    expect(screen.getByRole("button", { name: /^Cafe/, pressed: true })).toBeInTheDocument();
    expect(screen.getByText(/Pin at 35.71482, 139.79674/)).toBeInTheDocument();
  });

  it("does not carry 'been there' onto a trip you have not taken yet", async () => {
    const user = userEvent.setup();
    searchLibrary.mockResolvedValue([SAVED]);
    open();

    await user.type(await openSearch(user), "fugl");
    await user.click(await savedSuggestion());

    expect(screen.getByRole("checkbox", { name: /Been there already/ })).not.toBeChecked();
  });

  it("puts the list away once you have taken one", async () => {
    const user = userEvent.setup();
    searchLibrary.mockResolvedValue([SAVED]);
    open();

    await user.type(await openSearch(user), "fugl");
    await user.click(await savedSuggestion());

    expect(screen.queryByText("Saved before")).not.toBeInTheDocument();
  });

  it("waits for typing to stop rather than asking once per letter", async () => {
    const user = userEvent.setup();
    searchLibrary.mockResolvedValue([SAVED]);
    open();

    await user.type(await openSearch(user), "fuglen");
    await screen.findByText("Saved before");

    /* Six letters, and nowhere near six queries. The debounce is the whole
       reason this can run on a keystroke at all. */
    expect(searchLibrary.mock.calls.length).toBeLessThan(4);
  });

  it("says nothing when you have never saved anything like it", async () => {
    const user = userEvent.setup();
    open();

    await user.type(await openSearch(user), "somewhere new");

    expect(screen.queryByText("Saved before")).not.toBeInTheDocument();
  });

  it("does not go looking for a saved place when what you pasted is a link", async () => {
    /* A shared link names one place exactly. There is nothing to suggest. */
    const user = userEvent.setup();
    open();

    await user.type(await openSearch(user), "https://maps.app.goo.gl/aB3xY9");

    expect(searchLibrary).not.toHaveBeenCalled();
  });

  it("still lets the geocoder answer for somewhere you have never been", async () => {
    const user = userEvent.setup();
    searchLibrary.mockResolvedValue([]);
    searchPlaces.mockResolvedValue([FUGLEN]);
    open();

    await user.type(await openSearch(user), "fuglen asakusa");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText(FUGLEN.address)).toBeInTheDocument();
  });

  it("carries on without suggestions when the library cannot be reached", async () => {
    /* Nothing anyone can act on, so nothing is said about it — the search
       button below is still there and still works. */
    const user = userEvent.setup();
    searchLibrary.mockRejectedValue(new Error("offline"));
    searchPlaces.mockResolvedValue([FUGLEN]);
    open();

    await user.type(await openSearch(user), "fuglen");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText(FUGLEN.address)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so plainly when the trip can't be loaded", async () => {
    fetchTrip.mockRejectedValue(new Error("nope"));
    open();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't open that trip.");
  });

  /* ── Sharing ─────────────────────────────────────────────────────── */

  it("shows a viewer the trip without any of the controls that change it", async () => {
    openAs("viewer");

    await screen.findByRole("heading", { name: "Japan 2026" });

    expect(screen.queryByRole("button", { name: "Add place" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Been" })).not.toBeInTheDocument();
  });

  it("tells a viewer why those controls are missing", async () => {
    /* Otherwise the absence reads as something failing to load. */
    openAs("viewer");

    expect(await screen.findByText("View only")).toBeInTheDocument();
  });

  it("still lets a viewer follow a place out to Google Maps", async () => {
    /* Read-only is not the same as inert — the links are the point of being
       shown a trip at all. */
    openAs("viewer");

    const card = (await screen.findByRole("heading", { name: "Fuglen Asakusa" })).closest("li")!;
    expect(within(card).getByRole("link", { name: "Fuglen Asakusa in Google Maps" })).toBeInTheDocument();
  });

  it("gives an editor everything except the guest list", async () => {
    openAs("editor");

    await screen.findByRole("heading", { name: "Japan 2026" });

    expect(screen.getByRole("button", { name: "Add place" })).toBeInTheDocument();
    expect(screen.queryByText("View only")).not.toBeInTheDocument();

    const card = screen.getByRole("heading", { name: "Ichiran" }).closest("li")!;
    expect(within(card).getByRole("button", { name: "Been" })).toBeInTheDocument();
  });

  it("will not open the place form when a viewer presses the map", async () => {
    /* The map long-press drops a pin. For a viewer that would open a form
       whose save button can only ever fail. */
    const user = userEvent.setup();
    openAs("viewer");
    await screen.findByRole("heading", { name: "Japan 2026" });

    await user.click(screen.getByTestId("drop-pin"));

    expect(screen.queryByRole("dialog", { name: "Add a place" })).not.toBeInTheDocument();
  });

  it("draws everyone on the trip as their initials", async () => {
    openAs("owner", {
      collaborators: [
        { id: 4, name: "Ana Lopez", role: "editor" },
        { id: 5, name: "Bo Chen", role: "viewer" },
      ],
    });

    const people = await screen.findByRole("button", { name: /3 people on this trip/i });

    expect(within(people).getByText("GE")).toBeInTheDocument();
    expect(within(people).getByText("AL")).toBeInTheDocument();
    expect(within(people).getByText("BC")).toBeInTheDocument();
  });

  it("says who added a place, where somebody else did", async () => {
    openAs("owner");

    const card = (await screen.findByRole("heading", { name: "teamLab Borderless" })).closest("li")!;

    expect(within(card).getByTitle("Added by Ana Lopez")).toBeInTheDocument();
  });

  it("opens the people sheet from the avatars", async () => {
    const user = userEvent.setup();
    openAs("owner", { collaborators: [{ id: 4, name: "Ana Lopez", role: "editor" }] });

    await user.click(await screen.findByRole("button", { name: /2 people on this trip/i }));

    expect(await screen.findByRole("dialog", { name: "People on this trip" })).toBeInTheDocument();
    expect(fetchMembers).toHaveBeenCalledWith(7);
  });
});


describe("keeping up with everyone else", () => {
  /* The same tree as `open`, plus somewhere to land when the trip goes away.
     A function, not a constant: handed back the very same element object React
     bails out of re-rendering, and the rerenders below would do nothing. */
  const tree = () => (
    <MemoryRouter initialEntries={["/trips/7"]}>
      <AuthProvider>
        <Routes>
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/" element={<p>Your trips</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

  it("brings in a place somebody else added, without the page being reloaded", async () => {
    const { rerender } = render(tree());
    await screen.findByRole("heading", { name: "Japan 2026" });
    expect(screen.queryAllByText("Nakameguro")).toHaveLength(0);

    // Somebody else adds a place: their write moved this trip's stamp.
    fetchTrip.mockResolvedValue({
      ...structuredClone(TRIP),
      places: [...structuredClone(TRIP).places, place({ id: 4, name: "Nakameguro" })],
    });
    live.current = { trips: { 7: 200 }, invitations: { count: 0, latest: null } };
    rerender(tree());

    /* Twice over, and that is the point: the card in the list and the pin on
       the map both come off the same refetched trip. */
    expect(await screen.findAllByText("Nakameguro")).toHaveLength(2);
  });

  it("asks for nothing while the stamp holds still", async () => {
    const { rerender } = render(tree());
    await screen.findByRole("heading", { name: "Japan 2026" });
    expect(fetchTrip).toHaveBeenCalledTimes(1);

    live.current = { trips: { 7: 100 }, invitations: { count: 1, latest: 5 } };
    rerender(tree());

    // A change elsewhere is not a change here.
    expect(fetchTrip).toHaveBeenCalledTimes(1);
  });

  it("sends you back to the list when you are taken off the trip", async () => {
    const { rerender } = render(tree());
    await screen.findByRole("heading", { name: "Japan 2026" });

    /* Nothing records a removal — the trip simply stops being listed, and its
       absence is the whole signal. Better than leaving somebody on a screen
       whose next tap answers 404. */
    live.current = { trips: {}, invitations: { count: 0, latest: null } };
    rerender(tree());

    expect(await screen.findByText("Your trips")).toBeInTheDocument();
  });

  it("does not bounce you off a perfectly good trip before the first digest", async () => {
    live.current = null;
    render(tree());

    expect(await screen.findByRole("heading", { name: "Japan 2026" })).toBeInTheDocument();
    expect(screen.queryByText("Your trips")).not.toBeInTheDocument();
  });

  it("moves somebody from invited to on the trip while the sheet is open", async () => {
    const user = userEvent.setup();
    fetchMembers.mockResolvedValue({
      owner: { id: 99, name: "Glee Earl", role: "owner" },
      members: [],
      invitations: [
        {
          id: 1,
          role: "editor",
          user: { id: 4, name: "Ana Lopez" },
          invitedBy: { id: 99, name: "Glee Earl" },
          trip: { id: 7, name: "Japan 2026", destination: "", startDate: null, endDate: null },
        },
      ],
    });

    fetchTrip.mockResolvedValue({
      ...structuredClone(TRIP),
      collaborators: [{ id: 4, name: "Ana Lopez", role: "editor" }],
    });

    const { rerender } = render(tree());
    await user.click(await screen.findByRole("button", { name: /2 people on this trip/i }));
    await screen.findByRole("dialog", { name: "People on this trip" });
    expect(fetchMembers).toHaveBeenCalledTimes(1);

    // Ana accepts, somewhere else entirely. Her membership touched the trip.
    fetchMembers.mockResolvedValue({
      owner: { id: 99, name: "Glee Earl", role: "owner" },
      members: [{ id: 4, name: "Ana Lopez", role: "editor", email: null }],
      invitations: [],
    });
    live.current = { trips: { 7: 200 }, invitations: { count: 0, latest: null } };
    rerender(tree());

    /* Before this, the only way to find out was to close the sheet and open it
       again — the remount was the refresh. */
    await vi.waitFor(() => expect(fetchMembers).toHaveBeenCalledTimes(2));
  });
});
