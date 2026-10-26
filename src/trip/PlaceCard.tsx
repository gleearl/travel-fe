import { categoryOf } from "../lib/categories";
import { googleMapsUrl } from "../lib/maps";
import type { Place } from "../lib/api/types";
import { Avatar } from "../ui/Avatar";
import { InstagramMark } from "../ui/InstagramMark";
import { Stamp } from "../ui/Stamp";
import { TagList } from "../ui/TagChip";

/* An entry in the guide. The name, where it is, the category written as well
   as coloured, and whatever you wrote down about it.

   The whole card is the button that selects the pin — a card you can read but
   not press would leave the map reachable only by aiming at an 18px circle.
   While choosing several places at once, the same press ticks it instead. */
export function PlaceCard({
  place,
  selected,
  onSelect,
  onView,
  ownerId,
  choosing = false,
  chosen = false,
  onToggleChosen,
}: {
  place: Place;
  selected: boolean;
  onSelect: () => void;
  /** Opens the whole place — every tag, the full note, and Edit for those who may. */
  onView: () => void;
  /** Whose trip this is, which is what makes an "added by" worth drawing. */
  ownerId: number | null;
  /** True while several places are being picked to act on together. */
  choosing?: boolean;
  chosen?: boolean;
  onToggleChosen?: () => void;
}) {
  const category = categoryOf(place.category);

  /* Only when somebody other than the trip's owner put it here. On a trip
     you are keeping alone that is never true, so no card carries a face it
     does not need; on a shared one it marks exactly what a companion added. */
  const addedBy = place.addedBy && place.addedBy.id !== ownerId ? place.addedBy : null;

  return (
    <li
      /* How the panel finds this card again when its pin is tapped. */
      data-place={place.id}
      className={[
        "rounded-card border bg-surface transition-colors",
        (choosing ? chosen : selected) ? "border-active shadow-card ring-1 ring-active" : "border-rule",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={choosing ? onToggleChosen : onSelect}
        role={choosing ? "checkbox" : undefined}
        aria-checked={choosing ? chosen : undefined}
        aria-current={!choosing && selected ? "true" : undefined}
        aria-label={choosing ? place.name : undefined}
        className="block w-full px-3.5 py-3 text-left"
      >
        <div className="flex items-start gap-2.5">
          {choosing ? (
            <span
              aria-hidden="true"
              className={[
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border-[1.5px]",
                chosen ? "border-active bg-active text-paper" : "border-rule-strong bg-surface",
              ].join(" ")}
            >
              {chosen ? (
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2.5 6.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
          ) : null}
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

            {place.tags.length > 0 ? (
              /* Three, then "+N": a card is for telling places apart at a
                 glance, and the rest are one tap away in View. */
              <div className="mt-1.5">
                <TagList tags={place.tags} limit={3} />
              </div>
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

      {/* Everything you can do to a place, on one line. Maps goes out to Google
          because our own map has no Street View or listing, and their embed
          needs an API key with a card behind it — this is the documented Maps
          URL, which anyone may link to.

          The links sit here rather than up on the address line, where they
          belong: an <a> cannot be nested inside a <button>, and the whole card
          body is the button that selects the pin. */}
      {choosing ? null : (
        <div className="flex items-center gap-1 border-t border-rule px-2 py-1">
          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${place.name} in Google Maps`}
            className="stamp min-h-9 rounded-card px-2 leading-9 text-ink-2 hover:bg-accent-soft hover:text-ink"
          >
            Maps ↗
          </a>

          {place.link ? (
            /* A mark rather than a word, so it reads as the source it came from
               rather than as another thing to press. Padded out to the same
               height as its neighbours all the same: 16px of ink is not a
               thumb-sized target. */
            <a
              href={place.link}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Post about ${place.name}`}
              className="flex min-h-9 items-center rounded-card px-2 text-ink-3 hover:bg-accent-soft hover:text-ink"
            >
              <InstagramMark />
            </a>
          ) : null}

          <div className="ml-auto flex items-center gap-1">
            {addedBy ? (
              <Avatar name={addedBy.name} size={20} title={`Added by ${addedBy.name}`} />
            ) : null}

            {/* For everyone, viewers included: reading the whole place is not
                an edit, and Edit itself lives one step in, inside View. */}
            <button
              type="button"
              onClick={onView}
              aria-label={`View ${place.name}`}
              className="stamp min-h-9 rounded-card px-2 text-ink hover:bg-accent-soft"
            >
              View
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
