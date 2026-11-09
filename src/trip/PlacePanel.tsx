import { useEffect, useRef, useState } from "react";
import type { Category } from "../lib/categories";
import type { TripRole } from "../lib/api/types";
import { AvatarStack } from "../ui/Avatar";
import { countLabel, formatDateRange } from "../lib/format";
import type { Place, Trip } from "../lib/api/types";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { reveal } from "../lib/reveal";
import { Stamp } from "../ui/Stamp";
import { CategoryFilter } from "./CategoryFilter";
import { PlaceCard } from "./PlaceCard";
import { SelectionBar } from "./SelectionBar";
import { TagFilter } from "./TagFilter";

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
  tags,
  activeTags,
  onToggleTag,
  revealKey,
  onSelect,
  onView,
  choosing,
  chosen,
  onChoosing,
  onChosenChange,
  onBulkVisited,
  onBulkEdit,
  onBulkDelete,
  onAdd,
  onEditTrip,
  role,
  onShowPeople,
  onShare,
}: {
  trip: Trip;
  /** Every place on the trip, for the counts. */
  places: Place[];
  /** What survives the filter, in order. */
  visible: Place[];
  counts: Record<Category, number>;
  active: Set<Category>;
  selectedId: number | null;
  /** Bumped whenever the selection was made somewhere the list cannot see —
   *  a pin on the map — which is when the list has to come and find it. */
  revealKey: number;
  onToggleCategory: (category: Category) => void;
  /** Every tag on this trip, most used first. */
  tags: { tag: string; count: number }[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onSelect: (id: number) => void;
  onView: (place: Place) => void;
  /** Picking several places to act on together — editors only. */
  choosing: boolean;
  chosen: Set<number>;
  onChoosing: (on: boolean) => void;
  onChosenChange: (ids: Set<number>) => void;
  onBulkVisited: (visited: boolean) => Promise<void>;
  onBulkEdit: () => void;
  onBulkDelete: () => Promise<void>;
  onAdd: () => void;
  onEditTrip: () => void;
  /** What this account may do here. The only thing gating any control below. */
  role: TripRole;
  onShowPeople: () => void;
  /** The share link — the owner's alone, like the guest list. */
  onShare: () => void;
}) {
  const seen = places.filter((p) => p.visited).length;
  const canEdit = role !== "viewer";

  /* A pin tapped on the map selects a card that may be anywhere in the list,
     or below the fold of a sheet that is only half up. Selecting it silently
     leaves the map looking unresponsive, so the list scrolls to it. */
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (selectedId === null) return;
    const card = list.current?.querySelector(`[data-place="${selectedId}"]`);
    if (card instanceof HTMLElement) reveal(card);
  }, [revealKey, selectedId]);

  /* On the desktop rail the trip's own line stays put while the list scrolls
     under it, so Add place is never a scroll away. It gets a rule beneath it
     only once something is actually passing under — at rest it should look
     like the top of the page, not a toolbar. The phone's sheet is its own
     scroller with its own handle, and none of the lg: classes apply there. */
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px -mb-px" />
      {/* Wraps: with Share, Edit and Add place beside it a trip name on a phone
          would be cut to a word, so the buttons drop below it instead.
          The negative margins and top match the rail's padding: the bar runs
          edge to edge, and sticks flush to the rail's top edge rather than a
          padding's width below it, where a sliver of card would show above. */}
      <div
        className={[
          "flex flex-wrap items-start justify-between gap-3",
          "lg:sticky lg:-top-5 lg:z-10 lg:-mx-5 lg:-mt-5 lg:border-b lg:bg-paper/95 lg:px-5 lg:pt-5 lg:pb-3 lg:backdrop-blur-sm",
          "lg:transition-[border-color,box-shadow] lg:duration-200",
          stuck ? "lg:border-rule lg:shadow-card" : "lg:border-transparent",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1 basis-48">
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
          {role === "owner" ? (
            <Button size="sm" onClick={onShare}>
              Share
            </Button>
          ) : null}
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
        <div className="mt-3.5 lg:mt-2">
          <CategoryFilter active={active} counts={counts} onToggle={onToggleCategory} />
          {tags.length > 0 ? (
            <div className="mt-2">
              <TagFilter tags={tags} active={activeTags} onToggle={onToggleTag} />
            </div>
          ) : null}
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
          Nothing on this trip matches those filters yet.
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
          {/* Only when a filter is hiding some: otherwise the count is
              already in the trip's own line above. */}
          <Stamp>{visible.length < places.length ? `Showing ${visible.length} of ${places.length}` : ""}</Stamp>
          {canEdit ? (
            <Button size="sm" variant={choosing ? "primary" : "secondary"} onClick={() => onChoosing(!choosing)}>
              {choosing ? "Done" : "Select"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <ul ref={list} className="mt-2 flex flex-col gap-2.5">
        {visible.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={place.id === selectedId}
            onSelect={() => onSelect(place.id)}
            onView={() => {
              onSelect(place.id);
              onView(place);
            }}
            ownerId={trip.owner?.id ?? null}
            choosing={choosing}
            chosen={chosen.has(place.id)}
            onToggleChosen={() => {
              const next = new Set(chosen);
              next.has(place.id) ? next.delete(place.id) : next.add(place.id);
              onChosenChange(next);
            }}
          />
        ))}
      </ul>

      {choosing ? (
        <SelectionBar
          count={chosen.size}
          total={visible.length}
          allVisited={visible.filter((p) => chosen.has(p.id)).every((p) => p.visited)}
          onSelectAll={() => onChosenChange(new Set(visible.map((p) => p.id)))}
          onClear={() => onChosenChange(new Set())}
          onMarkVisited={onBulkVisited}
          onEdit={onBulkEdit}
          onDelete={onBulkDelete}
        />
      ) : null}
    </>
  );
}
