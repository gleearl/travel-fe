import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api/http";
import { copySharedTrip, fetchSharedTrip, joinSharedTrip, type SharedTrip as Shared } from "../lib/api/sharing";
import { countLabel, formatDateRange } from "../lib/format";
import { DESKTOP, useMediaQuery } from "../lib/useMediaQuery";
import { AppHeader } from "../ui/AppHeader";
import { Button } from "../ui/Button";
import { Mark } from "../ui/Mark";
import { Stamp } from "../ui/Stamp";
import { BottomSheet, type Snap } from "../trip/BottomSheet";
import { CategoryFilter } from "../trip/CategoryFilter";
import { PlaceCard } from "../trip/PlaceCard";
import { PlaceDetail } from "../trip/PlaceDetail";
import { TagFilter } from "../trip/TagFilter";
import { TripMap } from "../trip/TripMap";
import { usePlaceFilters } from "../trip/usePlaceFilters";

type Intent = "join" | "copy";

/**
 * A trip opened from its share link. Everything is readable without an
 * account; joining or copying asks for one, then comes straight back here and
 * finishes what was started.
 */
export function SharedTrip() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status } = useAuth();
  const desktop = useMediaQuery(DESKTOP);

  const [trip, setTrip] = useState<Shared | null>(null);
  const [missing, setMissing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [snap, setSnap] = useState<Snap>("half");
  const [busy, setBusy] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const places = trip?.places ?? [];
  const { counts, tags, active, activeTags, visible, toggleCategory, toggleTag } = usePlaceFilters(places);

  /* Asked again once the account is known, so "your role" reflects whoever is
     now signed in rather than the stranger who first opened the link. */
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    fetchSharedTrip(token)
      .then((found) => !cancelled && setTrip(found))
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [token, status, user]);

  async function act(intent: Intent) {
    if (!user) {
      /* Signing up is the likely way in for someone holding a link, so that
         is where this goes; the form links on to sign-in, carrying this along.
         `then` is what finishes the job on the way back. */
      navigate("/sign-up", { state: { from: `/s/${token}?then=${intent}` } });
      return;
    }

    setBusy(intent);
    setError(null);
    try {
      const tripId = intent === "join" ? await joinSharedTrip(token) : await copySharedTrip(token);
      navigate(`/trips/${tripId}`, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 404
          ? "This link has been turned off."
          : intent === "join"
            ? "Couldn't join the trip. Try again."
            : "Couldn't copy the trip. Try again.",
      );
      setBusy(null);
    }
  }

  /* Back from signing up or in with something still to do. Once only: the
     page renders more than once on the way, and joining twice is harmless but
     copying twice is not. */
  const finished = useRef(false);
  useEffect(() => {
    const then = params.get("then");
    if (!user || !trip || finished.current || (then !== "join" && then !== "copy")) return;
    finished.current = true;
    if (then === "join" && trip.tripId !== null) navigate(`/trips/${trip.tripId}`, { replace: true });
    else void act(then);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the account and trip are both known
  }, [user, trip, params]);

  const viewing = places.find((p) => p.id === viewingId) ?? null;

  const header = user ? (
    <AppHeader back={{ to: "/", label: "Trips" }} />
  ) : (
    <header className="flex items-center justify-between gap-3 border-b border-rule bg-paper/90 px-4 py-2.5 backdrop-blur-sm">
      <span className="-ml-1 inline-flex min-h-11 items-center gap-2 px-1 text-ink">
        <Mark size={26} />
        <span className="stamp pt-0.5">Field Guide</span>
      </span>
      <Link
        to="/sign-in"
        state={{ from: location.pathname }}
        className="stamp inline-flex min-h-11 items-center rounded-card px-2.5 text-ink-2 hover:bg-accent-soft hover:text-ink"
      >
        Sign in
      </Link>
    </header>
  );

  if (missing) {
    return (
      <div className="relative z-10 min-h-dvh">
        {header}
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="font-display text-2xl text-ink">This link doesn’t work any more</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
            The trip’s owner may have turned it off. Ask them to share it with you again.
          </p>
        </div>
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
    <>
      <Stamp>Shared by {trip.owner?.name ?? "someone"}</Stamp>
      <h1 className="mt-1 font-display text-[1.5rem] leading-tight text-ink">{trip.name}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1">
        <Stamp>{formatDateRange(trip.startDate, trip.endDate)}</Stamp>
        <Stamp>{countLabel(places.length, "place")}</Stamp>
      </div>

      <TakeIt trip={trip} signedIn={user !== null} busy={busy} error={error} onAct={act} onOpen={() => navigate(`/trips/${trip.tripId}`)} />

      {places.length > 0 ? (
        <div className="mt-4">
          <CategoryFilter active={active} counts={counts} onToggle={toggleCategory} />
          {tags.length > 0 ? (
            <div className="mt-2">
              <TagFilter tags={tags} active={activeTags} onToggle={toggleTag} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="py-10 text-center text-[0.9375rem] text-ink-2">No places on this trip yet.</p>
      )}

      <ul className="mt-3 flex flex-col gap-2.5 pb-4">
        {visible.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={place.id === selectedId}
            onSelect={() => setSelectedId(place.id)}
            onView={() => {
              setSelectedId(place.id);
              setViewingId(place.id);
            }}
            ownerId={trip.owner?.id ?? null}
          />
        ))}
      </ul>
    </>
  );

  return (
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
      {header}

      <div className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[380px_1fr]">
        {desktop ? (
          <aside className="hidden min-h-0 overflow-y-auto border-r border-rule bg-paper px-5 py-5 lg:block">
            {panel}
          </aside>
        ) : null}

        <div className="absolute inset-0 z-0 lg:relative">
          <TripMap
            trip={trip}
            places={visible}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSnap((current) => (current === "full" ? "half" : current));
            }}
            // Reading only: there is nothing to drop a pin onto.
            onDropPin={() => undefined}
            bottomPadding={desktop ? 72 : Math.round(window.innerHeight * 0.45)}
          />
        </div>

        {!desktop ? (
          <BottomSheet label="Places on this trip" snap={snap} onSnapChange={setSnap}>
            {panel}
          </BottomSheet>
        ) : null}
      </div>

      {viewing ? (
        <PlaceDetail
          place={viewing}
          canEdit={false}
          ownerId={trip.owner?.id ?? null}
          onClose={() => setViewingId(null)}
          onEdit={() => undefined}
          onToggleVisited={() => undefined}
        />
      ) : null}
    </div>
  );
}

/* The two ways to take a shared trip further, or the way into it for someone
   already on it. Said plainly, because "join" and "copy" mean very different
   things for whose changes you see. */
function TakeIt({
  trip,
  signedIn,
  busy,
  error,
  onAct,
  onOpen,
}: {
  trip: Shared;
  signedIn: boolean;
  busy: Intent | null;
  error: string | null;
  onAct: (intent: Intent) => void;
  onOpen: () => void;
}) {
  if (trip.yourRole && trip.tripId !== null) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-card border border-rule bg-surface px-3.5 py-3">
        <p className="text-[0.9375rem] text-ink-2">
          {trip.yourRole === "owner" ? "This is your trip." : "You’re already on this trip."}
        </p>
        <Button size="sm" variant="primary" onClick={onOpen}>
          Open trip
        </Button>
      </div>
    );
  }

  const owner = trip.owner?.name ?? "the owner";

  /* Compact on purpose: on a phone this shares half a screen with the places
     themselves, and the places are what the link was sent for. */
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-card border border-rule bg-surface p-3">
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" disabled={busy !== null} onClick={() => onAct("join")}>
          {busy === "join" ? "Joining…" : "Join this trip"}
        </Button>
        <Button className="flex-1" disabled={busy !== null} onClick={() => onAct("copy")}>
          {busy === "copy" ? "Copying…" : "Copy to my trips"}
        </Button>
      </div>
      <p className="text-[0.8125rem] leading-snug text-ink-3">
        {trip.shareRole === "editor" ? `Join to plan it with ${owner}` : `Join to follow along as ${owner} plans it`}
        , or copy it to change on your own.{signedIn ? "" : " Both need a free account."}
      </p>

      {error ? (
        <p role="alert" className="text-[0.875rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
