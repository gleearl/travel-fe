import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CATEGORY_IDS, type Category } from "../lib/categories";
import { updatePlace } from "../lib/api/places";
import { fetchTrip } from "../lib/api/trips";
import type { Place, Trip } from "../lib/api/types";
import { useChanged, useLiveUpdates } from "../live/useLiveUpdates";
import { DESKTOP, useMediaQuery } from "../lib/useMediaQuery";
import { AppHeader } from "../ui/AppHeader";
import { TripForm } from "../trips/TripForm";
import { BottomSheet, type Snap } from "./BottomSheet";
import { PeopleSheet } from "./PeopleSheet";
import { PlaceForm } from "./PlaceForm";
import { PlacePanel } from "./PlacePanel";
import { TripMap, useDefaultPoint } from "./TripMap";

/** What the place form is currently for: nothing, a new place, or an old one. */
type Editing = { kind: "new"; at: { lat: number; lng: number } } | { kind: "existing"; place: Place } | null;

export function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tripId = Number(id);
  const desktop = useMediaQuery(DESKTOP);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [active, setActive] = useState<Set<Category>>(new Set());
  const [snap, setSnap] = useState<Snap>("half");
  const [editing, setEditing] = useState<Editing>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [showingPeople, setShowingPeople] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTrip(tripId)
      .then((found) => !cancelled && setTrip(found))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  /* ── Keeping up with everyone else ───────────────────────────────────────
     A place another editor adds, a rename, a role that just changed: the stamp
     for this trip moves and we read it again. Replacing the trip wholesale is
     safe because both forms take their fields with `useState(initial)` and
     never sync from props, so an update arriving underneath one cannot
     overwrite what is half-typed in it. */
  const { updates } = useLiveUpdates();

  /* Except while one of our own writes is in the air. toggleVisited paints the
     new state under the thumb before the server has agreed; a refetch landing
     in that gap would flick the pin back and then forward again. */
  const writing = useRef(0);
  const missed = useRef(false);

  const reloadTrip = useCallback(() => {
    if (writing.current > 0) {
      missed.current = true;
      return;
    }
    missed.current = false;
    fetchTrip(tripId)
      .then(setTrip)
      .catch(() => undefined);
  }, [tripId]);

  useChanged(updates?.trips[tripId] ?? null, reloadTrip);

  /* Gone from the digest means removed from the trip, or the trip deleted.
     Only once something has arrived: before that, every trip is "missing". */
  useEffect(() => {
    if (updates && !(tripId in updates.trips)) navigate("/", { replace: true });
  }, [updates, tripId, navigate]);

  const places = useMemo(() => trip?.places ?? [], [trip]);

  /* One field decides every control on this screen. A viewer reads the trip
     and follows its links; anything that would change it is not drawn at all,
     with a "View only" stamp saying why rather than leaving the gaps to be
     read as something failing to load. */
  const canEdit = trip !== null && trip.role !== "viewer";

  const counts = useMemo(() => {
    const tally = Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0])) as Record<Category, number>;
    for (const place of places) tally[place.category] += 1;
    return tally;
  }, [places]);

  /* An empty filter means everything. Keeping "all" as the absence of a
     choice rather than a sixth chip is what stops the two from disagreeing. */
  const visible = useMemo(
    () => (active.size === 0 ? places : places.filter((p) => active.has(p.category))),
    [places, active],
  );

  const defaultPoint = useDefaultPoint(trip ?? ({ destinationLat: null, destinationLng: null } as Trip), places);

  /* Selecting from the map brings the sheet down to where the card is
     readable and the pin is still visible; selecting from the list leaves the
     sheet where it is. */
  const selectFromMap = useCallback((placeId: number) => {
    setSelectedId(placeId);
    setSnap((current) => (current === "full" ? "half" : current));
  }, []);

  const replacePlace = useCallback((saved: Place) => {
    setTrip((current) =>
      current
        ? {
            ...current,
            places: current.places.some((p) => p.id === saved.id)
              ? current.places.map((p) => (p.id === saved.id ? saved : p))
              : [...current.places, saved],
          }
        : current,
    );
  }, []);

  async function toggleVisited(place: Place) {
    if (!canEdit) return;

    // Optimistic: the pin and the card change under the thumb that pressed them.
    const next = { ...place, visited: !place.visited };
    replacePlace(next);
    writing.current += 1;
    try {
      replacePlace(await updatePlace(place.id, next));
    } catch {
      replacePlace(place);
    } finally {
      writing.current -= 1;
      // Take the update we waved away while this was in the air.
      if (writing.current === 0 && missed.current) reloadTrip();
    }
  }

  if (failed) {
    return (
      <div className="relative z-10 min-h-dvh">
        <AppHeader back={{ to: "/", label: "Trips" }} />
        <p role="alert" className="px-6 py-16 text-center text-[0.9375rem] text-danger">
          Couldn't open that trip.
        </p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="relative z-10 grid min-h-dvh place-items-center text-ink-3" aria-busy="true">
        <span className="stamp">Unfolding the map</span>
      </div>
    );
  }

  const panel = (
    <PlacePanel
      trip={trip}
      places={places}
      visible={visible}
      counts={counts}
      active={active}
      selectedId={selectedId}
      onToggleCategory={(category) =>
        setActive((current) => {
          const next = new Set(current);
          next.has(category) ? next.delete(category) : next.add(category);
          return next;
        })
      }
      onSelect={setSelectedId}
      onEdit={(place) => setEditing({ kind: "existing", place })}
      onToggleVisited={toggleVisited}
      onAdd={() => setEditing({ kind: "new", at: defaultPoint })}
      onEditTrip={() => setEditingTrip(true)}
      role={trip.role}
      onShowPeople={() => setShowingPeople(true)}
    />
  );

  return (
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
      <AppHeader back={{ to: "/", label: "Trips" }} />

      <div className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[380px_1fr]">
        {/* The rail: the sheet's content, stood on its side, from lg up. */}
        {desktop ? (
          <aside className="hidden min-h-0 overflow-y-auto border-r border-rule bg-paper px-5 py-5 lg:block">
            {panel}
          </aside>
        ) : null}

        {/* z-0 is load-bearing: it makes this a stacking context of its own.
            Without it Leaflet's internal panes (z-index 400 and up) are
            compared against the sheet in the parent's context and paint over
            it — the map covers the list entirely, and only once tiles have
            loaded, which makes it look like a loading bug. */}
        <div className="absolute inset-0 z-0 lg:relative">
          <TripMap
            trip={trip}
            places={visible}
            selectedId={selectedId}
            onSelect={selectFromMap}
            /* A long press on open map means "a place here", which a viewer
               cannot make — opening the form for them would be offering a save
               button that can only fail. */
            onDropPin={(at) => canEdit && setEditing({ kind: "new", at })}
            /* The rail sits beside the map, so it hides nothing; the sheet
               sits over it and hides half. */
            bottomPadding={desktop ? 72 : Math.round(window.innerHeight * 0.45)}
          />
        </div>

        {!desktop ? (
          <BottomSheet label="Places on this trip" snap={snap} onSnapChange={setSnap}>
            {panel}
          </BottomSheet>
        ) : null}
      </div>

      {editing ? (
        <PlaceForm
          tripId={trip.id}
          place={editing.kind === "existing" ? editing.place : undefined}
          startingPoint={editing.kind === "new" ? editing.at : defaultPoint}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            replacePlace(saved);
            setSelectedId(saved.id);
            setEditing(null);
          }}
          onDeleted={(deletedId) => {
            setTrip((current) =>
              current ? { ...current, places: current.places.filter((p) => p.id !== deletedId) } : current,
            );
            setSelectedId((current) => (current === deletedId ? null : current));
            setEditing(null);
          }}
        />
      ) : null}

      {showingPeople ? (
        <PeopleSheet
          tripId={trip.id}
          role={trip.role}
          onClose={() => setShowingPeople(false)}
          onLeft={() => navigate("/", { replace: true })}
        />
      ) : null}

      {editingTrip ? (
        <TripForm
          trip={trip}
          onClose={() => setEditingTrip(false)}
          onSaved={(saved) => {
            // The update call answers without places; keep the ones we have.
            setTrip((current) => (current ? { ...saved, places: current.places } : saved));
            setEditingTrip(false);
          }}
          /* Both land back on the list — one because the trip has moved to a
             part of it this screen is not, the other because there is no trip
             left to be on. `replace` so Back does not return to a dead id. */
          onArchived={() => navigate("/", { replace: true })}
          onDeleted={() => navigate("/", { replace: true })}
        />
      ) : null}
    </div>
  );
}
