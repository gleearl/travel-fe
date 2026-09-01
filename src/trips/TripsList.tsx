import { useCallback, useEffect, useState } from "react";
import { fetchMyInvitations } from "../lib/api/invitations";
import { fetchTrips } from "../lib/api/trips";
import { invitationsKey, tripsKey } from "../lib/api/updates";
import { useChanged, useLiveUpdates } from "../live/useLiveUpdates";
import type { Invitation, Trip } from "../lib/api/types";
import { parseDate } from "../lib/format";
import { AppHeader } from "../ui/AppHeader";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { InvitationCard } from "./InvitationCard";
import { TripCard } from "./TripCard";
import { TripForm } from "./TripForm";

export function TripsList() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);

  /* Asked again rather than patched by hand: an accepted trip arrives with its
     place count, its people and our role on it already worked out, and none of
     that is on the invitation. */
  const forget = (id: number) => setInvitations((current) => current.filter((i) => i.id !== id));
  const reloadTrips = useCallback(
    () => fetchTrips().then(setTrips).catch(() => setFailed(true)),
    [],
  );

  /* Separately, and allowed to fail quietly: having nothing waiting is the
     normal case, and an invitations outage should not stop you seeing the trips
     you already have. */
  const reloadInvitations = useCallback(
    () => fetchMyInvitations().then(setInvitations).catch(() => undefined),
    [],
  );

  useEffect(() => {
    void reloadTrips();
    void reloadInvitations();
  }, [reloadTrips, reloadInvitations]);

  /* And then keep it current. Somebody inviting you, or renaming a trip you are
     on, or taking you off one, lands here without the page being reloaded — see
     src/live/useLiveUpdates.tsx. `tripsKey` folds the ids in with the stamps, so
     a trip arriving or leaving counts as a change too. */
  const { updates } = useLiveUpdates();
  useChanged(tripsKey(updates), reloadTrips);
  useChanged(invitationsKey(updates), reloadInvitations);

  /* Split by the last day of the trip, not the first: you are still on a trip
     on its final morning, and it should not move to "been there" until it is
     actually over. Undated trips are plans, so they sit with the upcoming. */
  const { upcoming, past } = split(trips ?? []);

  return (
    <div className="relative z-10 min-h-dvh">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-[2rem] leading-none text-ink">Your trips</h1>
          <Button variant="primary" onClick={() => setAdding(true)}>
            New trip
          </Button>
        </div>

        {trips === null && !failed ? (
          <p className="mt-10 text-center text-ink-3" aria-busy="true">
            <span className="stamp">Loading</span>
          </p>
        ) : null}

        {failed ? (
          <p role="alert" className="mt-10 text-center text-[0.9375rem] text-danger">
            Couldn't load your trips. Check the connection and reload.
          </p>
        ) : null}

        {trips?.length === 0 && invitations.length === 0 ? (
          <EmptyState
            title="Nothing planned yet"
            body="A trip is a name and a place. The list of things to see comes after."
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                Start your first trip
              </Button>
            }
          />
        ) : null}

        {invitations.length > 0 ? (
          <section className="mt-9">
            <h2 className="stamp mb-3 flex items-center gap-3 text-ink-3">
              Invited
              <span aria-hidden="true" className="h-px flex-1 bg-rule" />
            </h2>
            <ul className="flex flex-col gap-3">
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onAccepted={() => {
                    forget(invitation.id);
                    void reloadTrips();
                  }}
                  onDeclined={() => forget(invitation.id)}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {upcoming.length > 0 ? (
          <Section title="Upcoming" trips={upcoming} offset={0} />
        ) : null}
        {past.length > 0 ? (
          <Section title="Been there" trips={past} offset={upcoming.length} />
        ) : null}
      </main>

      {adding ? (
        <TripForm
          onClose={() => setAdding(false)}
          onSaved={(trip) => {
            setTrips((current) => [trip, ...(current ?? [])]);
            setAdding(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Section({ title, trips, offset }: { title: string; trips: Trip[]; offset: number }) {
  return (
    <section className="mt-9">
      <h2 className="stamp mb-3 flex items-center gap-3 text-ink-3">
        {title}
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </h2>
      <ul className="flex flex-col gap-3">
        {trips.map((trip, index) => (
          <TripCard key={trip.id} trip={trip} index={offset + index} />
        ))}
      </ul>
    </section>
  );
}

export function split(trips: Trip[]): { upcoming: Trip[]; past: Trip[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const past = trips.filter((trip) => {
    const end = parseDate(trip.endDate) ?? parseDate(trip.startDate);
    return end !== null && end < today;
  });

  const pastIds = new Set(past.map((t) => t.id));
  return { upcoming: trips.filter((t) => !pastIds.has(t.id)), past: past.reverse() };
}
