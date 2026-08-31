import type { Category } from "../lib/categories";
import type { TripRole } from "../lib/api/types";
import { AvatarStack } from "../ui/Avatar";
import { countLabel, formatDateRange } from "../lib/format";
import type { Place, Trip } from "../lib/api/types";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Stamp } from "../ui/Stamp";
import { CategoryFilter } from "./CategoryFilter";
import { PlaceCard } from "./PlaceCard";

/* Everything beside the map: the trip's own line, the filter, and the list.
   One component, rendered inside the phone's sheet or the desktop rail — the
   layout differs, what it says does not. */
export function PlacePanel({
  trip,
  places,
  visible,
  counts,
  active,
  selectedId,
  onToggleCategory,
  onSelect,
  onEdit,
  onToggleVisited,
  onAdd,
  onEditTrip,
  role,
  onShowPeople,
}: {
  trip: Trip;
  /** Every place on the trip, for the counts. */
  places: Place[];
  /** What survives the filter, in order. */
  visible: Place[];
  counts: Record<Category, number>;
  active: Set<Category>;
  selectedId: number | null;
  onToggleCategory: (category: Category) => void;
  onSelect: (id: number) => void;
  onEdit: (place: Place) => void;
  onToggleVisited: (place: Place) => void;
  onAdd: () => void;
  onEditTrip: () => void;
  /** What this account may do here. The only thing gating any control below. */
  role: TripRole;
  onShowPeople: () => void;
}) {
  const seen = places.filter((p) => p.visited).length;
  const canEdit = role !== "viewer";

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[1.5rem] leading-tight text-ink">{trip.name}</h1>
          {/* No separator characters: these wrap onto a second line on a
              narrow phone, and a middot left dangling at the end of the first
              one looks like something failed to render. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <Stamp>{formatDateRange(trip.startDate, trip.endDate)}</Stamp>
            <Stamp>{countLabel(places.length, "place")}</Stamp>
            {seen > 0 ? <Stamp color="var(--color-sight)">{seen} seen</Stamp> : null}
            {/* Said out loud, because otherwise the missing buttons below read
                as something that failed to load rather than as a fact about
                what this account may do. */}
            {!canEdit ? <Stamp>View only</Stamp> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <AvatarStack owner={trip.owner} collaborators={trip.collaborators} onClick={onShowPeople} />
          {canEdit ? (
            <>
              <Button size="sm" onClick={onEditTrip}>
                Edit
              </Button>
              <Button size="sm" variant="primary" onClick={onAdd}>
                Add place
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {places.length > 0 ? (
        <div className="mt-3.5">
          <CategoryFilter active={active} counts={counts} onToggle={onToggleCategory} />
        </div>
      ) : null}

      {places.length === 0 ? (
        <EmptyState
          title="No places yet"
          body={
            canEdit
              ? "Search for somewhere, or press and hold the map where you want a pin."
              : "Nothing has been added to this trip yet."
          }
          action={
            canEdit ? (
              <Button variant="primary" onClick={onAdd}>
                Add the first place
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {places.length > 0 && visible.length === 0 ? (
        <p className="py-10 text-center text-[0.9375rem] text-ink-2">
          Nothing of that kind on this trip yet.
        </p>
      ) : null}

      <ul className="mt-3 flex flex-col gap-2.5">
        {visible.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={place.id === selectedId}
            onSelect={() => onSelect(place.id)}
            onEdit={() => onEdit(place)}
            onToggleVisited={() => onToggleVisited(place)}
            canEdit={canEdit}
            ownerId={trip.owner?.id ?? null}
          />
        ))}
      </ul>
    </>
  );
}
