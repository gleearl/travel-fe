import { categoryOf } from "../lib/categories";
import type { Place } from "../lib/api/types";
import { Stamp } from "../ui/Stamp";

/* An entry in the guide. The name, where it is, the category written as well
   as coloured, and whatever you wrote down about it.

   The whole card is the button that selects the pin — a card you can read but
   not press would leave the map reachable only by aiming at an 18px circle. */
export function PlaceCard({
  place,
  selected,
  onSelect,
  onEdit,
  onToggleVisited,
}: {
  place: Place;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleVisited: () => void;
}) {
  const category = categoryOf(place.category);

  return (
    <li
      className={[
        "rounded-card border bg-surface transition-colors",
        selected ? "border-ink/45 shadow-card" : "border-rule",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="block w-full px-3.5 py-3 text-left"
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-pill"
            style={
              place.visited
                ? { border: `2px solid ${category.color}` }
                : { background: category.color }
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h3
                className={[
                  "truncate font-display text-[1.0625rem] leading-snug",
                  place.visited ? "text-ink-2" : "text-ink",
                ].join(" ")}
              >
                {place.name}
              </h3>
              <Stamp color={category.color} className="shrink-0">
                {place.visited ? "✓ Seen" : category.label}
              </Stamp>
            </div>

            {place.address ? (
              <p className="mt-0.5 truncate text-[0.8125rem] text-ink-3">{place.address}</p>
            ) : null}

            {place.notes ? (
              /* Italic, and in the serif: it is the one part of a card that
                 is in your own voice rather than the geocoder's. */
              <p className="mt-1.5 font-display text-[0.9375rem] leading-relaxed text-ink-2 italic">
                “{place.notes}”
              </p>
            ) : null}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-1 border-t border-rule px-2 py-1">
        <button
          type="button"
          onClick={onToggleVisited}
          aria-pressed={place.visited}
          className="stamp min-h-9 rounded-card px-2 text-ink-2 hover:bg-accent-soft hover:text-ink"
        >
          {place.visited ? "Not yet" : "Been"}
        </button>

        {place.link ? (
          <a
            href={place.link}
            target="_blank"
            rel="noreferrer noopener"
            className="stamp min-h-9 rounded-card px-2 leading-9 text-ink-2 hover:bg-accent-soft hover:text-ink"
          >
            Link ↗
          </a>
        ) : null}

        <button
          type="button"
          onClick={onEdit}
          className="stamp ml-auto min-h-9 rounded-card px-2 text-ink-2 hover:bg-accent-soft hover:text-ink"
        >
          Edit
        </button>
      </div>
    </li>
  );
}
