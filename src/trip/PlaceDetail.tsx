import { useKinds } from "../lib/useKinds";
import { googleMapsUrl } from "../lib/maps";
import type { Place } from "../lib/api/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { InstagramMark } from "../ui/InstagramMark";
import { Sheet } from "../ui/Sheet";
import { Stamp } from "../ui/Stamp";
import { TagList } from "../ui/TagChip";

/* One place, all of it: what the card has to shorten — every tag, the whole
   note, who added it — and the way into editing it. Reading comes first and
   changing it is one step further in, so a tap meant to look can't land in a
   form. */
export function PlaceDetail({
  place,
  canEdit,
  ownerId,
  onClose,
  onEdit,
  onToggleVisited,
}: {
  place: Place;
  canEdit: boolean;
  ownerId: number | null;
  onClose: () => void;
  onEdit: () => void;
  onToggleVisited: () => void;
}) {
  const category = useKinds().kindOf(place.category);
  const addedBy = place.addedBy && place.addedBy.id !== ownerId ? place.addedBy : null;

  return (
    <Sheet
      title={place.name}
      onClose={onClose}
      footer={
        canEdit ? (
          <div className="flex gap-2">
            <Button onClick={onToggleVisited} aria-pressed={place.visited} className="flex-1">
              {place.visited ? "Not been yet" : "Mark as been"}
            </Button>
            <Button variant="primary" onClick={onEdit} className="flex-1">
              Edit
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-pill" style={{ background: category.color }} />
            <Stamp color={category.color}>{category.label}</Stamp>
          </span>
          {place.visited ? <Stamp>✓ Been</Stamp> : null}
        </div>

        <TagList tags={place.tags} />

        {place.address ? <p className="text-[0.9375rem] leading-snug text-ink-2">{place.address}</p> : null}

        {place.notes ? (
          <p className="font-display text-[1rem] leading-relaxed whitespace-pre-line text-ink-2 italic">
            “{place.notes}”
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3">
          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${place.name} in Google Maps`}
            className="stamp inline-flex min-h-9 items-center rounded-card border border-rule px-3 text-ink-2 hover:bg-accent-soft hover:text-ink"
          >
            Maps ↗
          </a>

          {place.link ? (
            <a
              href={place.link}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Post about ${place.name}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-card border border-rule px-3 text-ink-2 hover:bg-accent-soft hover:text-ink"
            >
              <InstagramMark />
              <span className="stamp">Post</span>
            </a>
          ) : null}

          {addedBy ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
              <Avatar name={addedBy.name} size={20} />
              Added by {addedBy.name}
            </span>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
