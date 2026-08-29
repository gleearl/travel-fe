import { useState } from "react";
import { CATEGORIES, type Category } from "../lib/categories";
import { searchPlaces } from "../lib/api/geocode";
import { ApiError } from "../lib/api/http";
import { createPlace, deletePlace, updatePlace } from "../lib/api/places";
import type { GeocodeResult, Place, PlaceInput } from "../lib/api/types";
import { Button } from "../ui/Button";
import { Field, TextArea } from "../ui/Field";
import { Sheet } from "../ui/Sheet";
import { Stamp } from "../ui/Stamp";

export function PlaceForm({
  tripId,
  place,
  startingPoint,
  onClose,
  onSaved,
  onDeleted,
}: {
  tripId: number;
  /** Absent when this is a new place. */
  place?: Place;
  /** Where a dropped pin landed, or the middle of what's on screen. */
  startingPoint: { lat: number; lng: number };
  onClose: () => void;
  onSaved: (place: Place) => void;
  onDeleted: (id: number) => void;
}) {
  const [form, setForm] = useState<PlaceInput>(
    place
      ? { ...place }
      : {
          name: "",
          address: "",
          lat: startingPoint.lat,
          lng: startingPoint.lng,
          category: "other",
          link: "",
          notes: "",
          visited: false,
        },
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof PlaceInput>(key: K, value: PlaceInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(place ? await updatePlace(place.id, form) : await createPlace(tripId, form));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(false);
    }
  }

  async function remove() {
    if (!place) return;
    setBusy(true);
    try {
      await deletePlace(place.id);
      onDeleted(place.id);
    } catch {
      setError(new ApiError(0, "Couldn't delete that. Try again."));
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={place ? "Edit place" : "Add a place"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {place ? (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Delete
            </Button>
          ) : (
            <Button onClick={onClose} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" form="place-form" variant="primary" disabled={busy} className="flex-1">
            {busy ? "Saving…" : place ? "Save" : "Add to trip"}
          </Button>
        </div>
      }
    >
      {!place ? (
        <PlaceSearch
          onPick={(hit) => {
            setForm((f) => ({ ...f, name: hit.name, address: hit.address, lat: hit.lat, lng: hit.lng }));
          }}
        />
      ) : null}

      <form id="place-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Place"
          placeholder="Fuglen Asakusa"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={error?.fieldError("name")}
        />

        <Field
          label="Address"
          placeholder="2-6-15 Asakusa, Taito City"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          error={error?.fieldError("address")}
        />

        <div>
          <span className="stamp mb-1.5 block text-ink-2">Kind</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => {
              const on = form.category === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("category", category.id as Category)}
                  className="stamp inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3"
                  style={
                    on
                      ? { background: category.color, borderColor: category.color, color: "var(--color-paper)" }
                      : { borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }
                  }
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-pill"
                    style={{ background: on ? "var(--color-paper)" : category.color }}
                  />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label="Link"
          type="url"
          inputMode="url"
          placeholder="https://instagram.com/p/…"
          value={form.link}
          onChange={(e) => set("link", e.target.value)}
          error={error?.fieldError("link")}
          hint="The reel or post that put this on the list."
        />

        <TextArea
          label="Notes"
          placeholder="Things to try, when to go, what to avoid."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          error={error?.fieldError("notes")}
        />

        <label className="flex min-h-11 items-center gap-2.5 text-[0.9375rem] text-ink">
          <input
            type="checkbox"
            checked={form.visited}
            onChange={(e) => set("visited", e.target.checked)}
            className="h-4.5 w-4.5 accent-[var(--color-sight)]"
          />
          Been there already
        </label>

        <p className="border-t border-rule pt-3">
          <Stamp>
            Pin at {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </Stamp>
        </p>

        {error && Object.keys(error.errors).length === 0 ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error.message}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

/* Search, on submit rather than on every keystroke.

   Nominatim's usage policy is roughly a request a second, and an autocomplete
   would spend that on a single word. The button is the honest version of the
   constraint, and the API caches every answer besides. */
function PlaceSearch({ onPick }: { onPick: (hit: GeocodeResult) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;

    setBusy(true);
    setFailed(null);
    try {
      setHits(await searchPlaces(query));
    } catch (caught) {
      setFailed(caught instanceof ApiError ? caught.message : "Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-card border border-rule bg-sunk/60 p-3">
      <form onSubmit={search} className="flex items-end gap-2">
        <Field
          label="Find it"
          placeholder="Fuglen Asakusa"
          className="flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={busy || query.trim().length < 2}>
          {busy ? "…" : "Search"}
        </Button>
      </form>

      {failed ? (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
          {failed}
        </p>
      ) : null}

      {hits?.length === 0 ? (
        <p className="mt-2 text-[0.8125rem] text-ink-2">
          Nothing found. Type the name and address, or close this and press the map where it is.
        </p>
      ) : null}

      {hits && hits.length > 0 ? (
        <ul className="mt-2 flex flex-col divide-y divide-rule">
          {hits.map((hit) => (
            <li key={`${hit.lat},${hit.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(hit);
                  setHits(null);
                }}
                className="w-full rounded-card px-1.5 py-2.5 text-left hover:bg-accent-soft"
              >
                <span className="block text-[0.9375rem] text-ink">{hit.name}</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-3">{hit.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
