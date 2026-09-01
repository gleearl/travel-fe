import { useState } from "react";
import { searchPlaces } from "../lib/api/geocode";
import { countLabel } from "../lib/format";
import { ApiError } from "../lib/api/http";
import { archiveTrip, createTrip, deleteTrip, unarchiveTrip, updateTrip } from "../lib/api/trips";
import type { Trip, TripInput } from "../lib/api/types";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Sheet } from "../ui/Sheet";

const EMPTY: TripInput = {
  name: "",
  destination: "",
  destinationLat: null,
  destinationLng: null,
  startDate: "",
  endDate: "",
};

export function TripForm({
  trip,
  onClose,
  onSaved,
  onArchived,
  onDeleted,
}: {
  /** Absent when this is a new trip. */
  trip?: Trip;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
  /** Filed away or taken back out; the caller decides where to go next. */
  onArchived?: () => void;
  onDeleted?: () => void;
}) {
  const [form, setForm] = useState<TripInput>(
    trip
      ? {
          name: trip.name,
          destination: trip.destination,
          destinationLat: trip.destinationLat,
          destinationLng: trip.destinationLng,
          startDate: trip.startDate ?? "",
          endDate: trip.endDate ?? "",
        }
      : EMPTY,
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  /* The delete button, mid-question. There is no undo on the other side of
     it, and one stray tap on a phone should not be the whole ceremony. */
  const [confirming, setConfirming] = useState(false);

  /* Archiving and deleting are the owner's alone, and neither is a thing you
     can do to a trip that does not exist yet. */
  const dangerous = trip && trip.role === "owner";
  const archived = trip?.archivedAt != null;

  /* What the delete is about to take with it. The places themselves when the
     trip is carrying them — which is the case on the trip screen, where this
     sheet is opened from — and the count the list rides in on otherwise.
     `place_count` is `whenCounted`, so the detail call does not answer it and
     reading it alone would offer to delete "0 places" with three on screen. */
  const places = trip ? trip.places.length || trip.placeCount : 0;

  const set = (key: keyof TripInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      let payload = form;

      /* Look the destination up once, so the map has somewhere to open before
         the trip has any places. Best-effort: a trip whose destination the
         geocoder has never heard of is still a perfectly good trip. */
      if (form.destination && form.destination !== trip?.destination) {
        try {
          const [first] = await searchPlaces(form.destination);
          if (first) payload = { ...payload, destinationLat: first.lat, destinationLng: first.lng };
        } catch {
          /* Search is unavailable; carry on without coordinates. */
        }
      }

      onSaved(trip ? await updateTrip(trip.id, payload) : await createTrip(payload));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(false);
    }
  }

  /** Both archive directions, and the delete. Failures land in the same
      place every other error in this sheet does. */
  async function run(action: () => Promise<void>, done: () => void, whenItFails: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      done();
    } catch {
      setError(new ApiError(0, whenItFails));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Sheet
      title={trip ? "Edit trip" : "New trip"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" form="trip-form" variant="primary" disabled={busy} className="flex-1">
            {busy ? "Saving…" : trip ? "Save" : "Create trip"}
          </Button>
        </div>
      }
    >
      <form id="trip-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Trip"
          placeholder="Japan 2026"
          required
          autoFocus
          value={form.name}
          onChange={set("name")}
          error={error?.fieldError("name")}
        />

        <Field
          label="Destination"
          placeholder="Tokyo, Japan"
          value={form.destination}
          onChange={set("destination")}
          error={error?.fieldError("destination")}
          hint="Used to open the map in the right part of the world."
        />

        <div className="flex gap-3">
          <Field
            label="From"
            type="date"
            className="flex-1"
            value={form.startDate}
            onChange={set("startDate")}
            error={error?.fieldError("start_date")}
          />
          <Field
            label="To"
            type="date"
            className="flex-1"
            value={form.endDate}
            onChange={set("endDate")}
            error={error?.fieldError("end_date")}
          />
        </div>

        {error && Object.keys(error.errors).length === 0 ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error.message}
          </p>
        ) : null}
      </form>

      {dangerous ? (
        <div className="mt-7 flex items-center gap-2 border-t border-rule pt-4">
          <Button
            disabled={busy}
            onClick={() =>
              run(
                () => (archived ? unarchiveTrip(trip.id) : archiveTrip(trip.id)),
                () => onArchived?.(),
                archived ? "Couldn't restore that. Try again." : "Couldn't archive that. Try again.",
              )
            }
          >
            {archived ? "Restore" : "Archive"}
          </Button>

          {/* The count is the point of the second tap: "and its 14 places" is
              what makes a trip worth keeping obviously different from one
              worth losing. */}
          <Button
            variant="danger"
            disabled={busy}
            className="ml-auto"
            onClick={() =>
              confirming
                ? run(() => deleteTrip(trip.id), () => onDeleted?.(), "Couldn't delete that. Try again.")
                : setConfirming(true)
            }
          >
            {confirming ? `Really delete? · ${countLabel(places, "place")}` : "Delete"}
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}
