import { useState } from "react";
import { searchPlaces } from "../lib/api/geocode";
import { ApiError } from "../lib/api/http";
import { createTrip, updateTrip } from "../lib/api/trips";
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
}: {
  /** Absent when this is a new trip. */
  trip?: Trip;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
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
    </Sheet>
  );
}
