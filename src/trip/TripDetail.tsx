import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { deletePlace, updatePlace } from "../lib/api/places";
import { applyChanges, type BulkChanges } from "../lib/bulk";
import { withTripKinds, type Kind } from "../lib/categories";
import { KindsProvider } from "../lib/useKinds";
import { fetchTrip } from "../lib/api/trips";
import type { Place, Trip } from "../lib/api/types";
import { useChanged, useLiveUpdates } from "../live/useLiveUpdates";
import { DESKTOP, useMediaQuery } from "../lib/useMediaQuery";
import { AppHeader } from "../ui/AppHeader";
import { TripForm } from "../trips/TripForm";
import { BottomSheet, type Snap } from "./BottomSheet";
import { BulkEditSheet } from "./BulkEditSheet";
import { PeopleSheet } from "./PeopleSheet";
import { PlaceDetail } from "./PlaceDetail";
import { PlaceForm } from "./PlaceForm";
import { PlacePanel } from "./PlacePanel";
import { ShareSheet } from "./ShareSheet";
import { TripMap, useDefaultPoint } from "./TripMap";
import { usePlaceFilters } from "./usePlaceFilters";

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
  /* The place open in View, by id rather than by value: a live update or a
     save swaps the place object out, and View should show the new one. */
  const [viewingId, setViewingId] = useState<number | null>(null);
  /* Several places picked to act on at once. */
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [bulkEditing, setBulkEditing] = useState(false);
  const [snap, setSnap] = useState<Snap>("half");
  const [editing, setEditing] = useState<Editing>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [showingPeople, setShowingPeople] = useState(false);
  const [sharing, setSharing] = useState(false);
  /* Ticks on every selection made from the map, so the list scrolls to the
     card even when the same pin is tapped twice. */
  const [revealKey, setRevealKey] = useState(0);

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

  const kinds = useMemo(() => withTripKinds(trip?.kinds ?? []), [trip?.kinds]);

  const { counts, tags, active, activeTags, visible, toggleCategory, toggleTag } = usePlaceFilters(places, kinds);

  const viewing = places.find((p) => p.id === viewingId) ?? null;

  /* What you act on is what you can see: a place filtered out of view, or
     deleted by someone else, drops out of the selection rather than being
     changed off screen. */
  useEffect(() => {
    setChosen((current) => {
      const kept = new Set([...current].filter((id) => visible.some((p) => p.id === id)));
      return kept.size === current.size ? current : kept;
    });
  }, [visible]);

  const chosenPlaces = places.filter((p) => chosen.has(p.id));

  function stopChoosing() {
    setChoosing(false);
    setChosen(new Set());
    setBulkEditing(false);
  }

  const defaultPoint = useDefaultPoint(trip ?? { destinationLat: null, destinationLng: null }, places);

  /* Selecting from the map brings the sheet down to where the card is
     readable and the pin is still visible; selecting from the list leaves the
     sheet where it is. Either way the panel scrolls the card into view. */
  const selectFromMap = useCallback((placeId: number) => {
    setSelectedId(placeId);
    setSnap((current) => (current === "full" ? "half" : current));
    setRevealKey((n) => n + 1);
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

  /* A kind made or changed in the place form, put into the trip we have so it
     is a chip straight away — the live update that follows agrees with it. */
  const saveKind = useCallback((kind: Kind) => {
    setTrip((current) =>
      current
        ? {
            ...current,
            kinds: current.kinds.some((k) => k.id === kind.id)
              ? current.kinds.map((k) => (k.id === kind.id ? kind : k))
              : [...current.kinds, kind],
          }
        : current,
    );
  }, []);

  /* And one removed: its places go back to Other, as they have on the server. */
  const removeKind = useCallback((id: string) => {
    setTrip((current) =>
      current
        ? {
            ...current,
            kinds: current.kinds.filter((k) => k.id !== id),
            places: current.places.map((p) => (p.category === id ? { ...p, category: "other" } : p)),
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

  /* Every place saved in parallel. One that fails is put back the way it was
     and the rest stand — and the caller hears how many did not make it. */
  async function saveEach(targets: Place[], changes: BulkChanges, optimistic: boolean) {
    if (optimistic) for (const place of targets) replacePlace({ ...place, ...applyChanges(place, changes) });
    writing.current += 1;
    try {
      const results = await Promise.allSettled(
        targets.map((place) => updatePlace(place.id, applyChanges(place, changes))),
      );
      results.forEach((result, i) => replacePlace(result.status === "fulfilled" ? result.value : targets[i]));
      const failures = results.filter((r) => r.status === "rejected").length;
      if (failures > 0) {
        throw new Error(`Couldn't save ${failures} of ${targets.length}. Check your connection and try again.`);
      }
    } finally {
      writing.current -= 1;
      if (writing.current === 0 && missed.current) reloadTrip();
    }
  }

  async function bulkVisited(visited: boolean) {
    await saveEach(chosenPlaces, { visited, addTags: [], removeTags: [] }, true).catch(() => undefined);
  }

  async function bulkSave(changes: BulkChanges) {
    await saveEach(chosenPlaces, changes, false);
    stopChoosing();
  }

  async function bulkDelete() {
    const results = await Promise.allSettled(chosenPlaces.map((place) => deletePlace(place.id)));
    const gone = new Set(chosenPlaces.filter((_, i) => results[i].status === "fulfilled").map((p) => p.id));
    setTrip((current) => (current ? { ...current, places: current.places.filter((p) => !gone.has(p.id)) } : current));
    setSelectedId((current) => (current !== null && gone.has(current) ? null : current));
    // Whatever could not be deleted stays picked, so trying again is one press.
    if (gone.size === chosenPlaces.length) stopChoosing();
    else setChosen(new Set(chosenPlaces.filter((p) => !gone.has(p.id)).map((p) => p.id)));
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
      revealKey={revealKey}
      onToggleCategory={toggleCategory}
      tags={tags}
      activeTags={activeTags}
      onToggleTag={toggleTag}
      onSelect={setSelectedId}
      onView={(place) => setViewingId(place.id)}
      choosing={choosing}
      chosen={chosen}
      onChoosing={(on) => (on ? setChoosing(true) : stopChoosing())}
      onChosenChange={setChosen}
      onBulkVisited={bulkVisited}
      onBulkEdit={() => setBulkEditing(true)}
      onBulkDelete={bulkDelete}
      onAdd={() => setEditing({ kind: "new", at: defaultPoint })}
      onEditTrip={() => setEditingTrip(true)}
      role={trip.role}
      onShowPeople={() => setShowingPeople(true)}
      onShare={() => setSharing(true)}
    />
  );

  return (
    <KindsProvider kinds={kinds}>
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

        {/* Hidden, not closed, while its place is being edited: closing the form
            — saved or not — lands back on View, which is where Edit was. */}
        {viewing && !editing ? (
          <PlaceDetail
            place={viewing}
            canEdit={canEdit}
            ownerId={trip.owner?.id ?? null}
            onClose={() => setViewingId(null)}
            onEdit={() => setEditing({ kind: "existing", place: viewing })}
            onToggleVisited={() => toggleVisited(viewing)}
          />
        ) : null}

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
              setViewingId(null);
              setEditing(null);
            }}
            onKindSaved={saveKind}
            onKindDeleted={removeKind}
          />
        ) : null}

        {bulkEditing && chosenPlaces.length > 0 ? (
          <BulkEditSheet places={chosenPlaces} onClose={() => setBulkEditing(false)} onSave={bulkSave} />
        ) : null}

        {sharing ? <ShareSheet tripId={trip.id} onClose={() => setSharing(false)} /> : null}

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
    </KindsProvider>
  );
}
