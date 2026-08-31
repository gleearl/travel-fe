import { useEffect, useState } from "react";
import { CATEGORIES, categoryOf, type Category } from "../lib/categories";
import { searchPlaces } from "../lib/api/geocode";
import { searchLibrary } from "../lib/api/library";
import { resolveMapLink } from "../lib/api/mapLink";
import { suggestPlaceName } from "../lib/instagram";
import { looksLikeMapsLink } from "../lib/maps";
import { ApiError } from "../lib/api/http";
import { createPlace, deletePlace, updatePlace } from "../lib/api/places";
import type { GeocodeResult, LibraryPlace, Place, PlaceInput } from "../lib/api/types";
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
        /* Whatever the search found, merged over what is already typed. The
           geocoder knows a name and a point; a place you saved before knows
           its category, its link and the note you left on it too. */
        <PlaceSearch onPick={(found) => setForm((f) => ({ ...f, ...found }))} />
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
          onBlur={() => {
            const link = form.link.trim();

            if (link === "") return;

            /* Nobody copies the scheme off a phone, and the API takes this
               field as a url, so a pasted account would be refused on save. */
            const scheme = /^https?:\/\//i.test(link) ? link : `https://${link}`;

            if (scheme !== form.link) set("link", scheme);

            /* Only into a name you have not written yourself. A username tidied
               up is usually what the place is called, and where it is not it is
               a better start than an empty field. */
            if (form.name.trim() !== "") return;

            const suggested = suggestPlaceName(scheme);

            if (suggested !== null) set("name", suggested);
          }}
          error={error?.fieldError("link")}
          hint="The account that put this on the list. Its name fills the top of the form."
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

/** How long typing has to stop before the library is asked. */
const SETTLE_MS = 200;

/* Finding a place, two ways over one field.

   **Your own places, as you type.** A trip is a new list every time, but the
   places on it rarely are — the coffee shop worth going back to is worth
   putting on next year's trip too. Those come from our own database, so this
   half can answer on every keystroke; it waits only long enough for typing to
   stop, so a word costs one query rather than one per letter.

   **Everywhere else, on submit.** Nominatim's usage policy is roughly a
   request a second, and an autocomplete would spend that on a single word. The
   button is the honest version of that constraint, and the API caches every
   answer besides.

   The two are stacked rather than merged: somewhere you have already been is a
   different kind of answer from somewhere the map has heard of, and a list that
   blurred them would hide the shortcut inside the long way round. */
function PlaceSearch({ onPick }: { onPick: (found: Partial<PlaceInput>) => void }) {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<LibraryPlace[]>([]);
  const [hits, setHits] = useState<GeocodeResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  /* ── Places you have saved before ─────────────────────────────────── */
  useEffect(() => {
    const term = query.trim();

    /* Below two characters everything matches, and a suggestion that is always
       there is not a suggestion. A pasted link is not a name being typed. */
    if (term.length < 2 || looksLikeMapsLink(term)) {
      setSaved([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchLibrary(term)
        .then((found) => !cancelled && setSaved(found))
        /* Quietly: the geocoder below is still there, and a suggestion that
           failed to arrive is not something anyone can act on. */
        .catch(() => !cancelled && setSaved([]));
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  /* ── Everywhere else ──────────────────────────────────────────────── */
  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;

    setBusy(true);
    setFailed(null);
    try {
      /* A shared link names one place, so there is nothing to choose between:
         it goes straight into the form rather than into a list of one. */
      if (looksLikeMapsLink(query)) {
        onPick(await resolveMapLink(query));
        setHits(null);
        setQuery("");
        return;
      }

      setHits(await searchPlaces(query));
    } catch (caught) {
      setFailed(
        caught instanceof ApiError
          ? (caught.fieldError("url") ?? caught.message)
          : "Couldn't reach the server.",
      );
    } finally {
      setBusy(false);
    }
  }

  /** Taken up: the form is filled, and there is nothing left to choose. */
  function take(found: Partial<PlaceInput>) {
    onPick(found);
    setSaved([]);
    setHits(null);
  }

  return (
    <div className="mb-6 rounded-card border border-rule bg-sunk/60 p-3">
      <form onSubmit={search} className="flex items-end gap-2">
        <Field
          label="Find it"
          placeholder="Fuglen Asakusa, or a Google Maps link"
          className="flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={busy || query.trim().length < 2}>
          {busy ? "…" : "Search"}
        </Button>
      </form>

      {saved.length > 0 ? (
        <>
          {/* Said only when there is something to say — the heading appearing
              as you type is how anyone finds out this exists at all. */}
          <h3 className="stamp mt-3 mb-1 flex items-center gap-3 text-ink-3">
            Saved before
            <span aria-hidden="true" className="h-px flex-1 bg-rule" />
          </h3>
          <ul className="flex flex-col divide-y divide-rule">
            {saved.map((place) => (
              <li key={`${place.name}|${place.lat},${place.lng}`}>
                <button
                  type="button"
                  onClick={() => take(place)}
                  className="w-full rounded-card px-1.5 py-2.5 text-left hover:bg-accent-soft"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.9375rem] text-ink">{place.name}</span>
                    <Stamp color={categoryOf(place.category).color} className="shrink-0">
                      {categoryOf(place.category).label}
                    </Stamp>
                  </span>
                  {/* Which trip it is from, because a name on its own is not
                      always enough to know which of two places this is. */}
                  <span className="mt-0.5 block truncate text-[0.8125rem] leading-snug text-ink-3">
                    {place.tripName ? `From ${place.tripName}` : place.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

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
                onClick={() => take(hit)}
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
