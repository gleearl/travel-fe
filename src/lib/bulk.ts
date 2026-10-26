import type { Category } from "./categories";
import type { Place, PlaceInput } from "./api/types";
import { cleanTag, hasTag, MAX_TAGS } from "./tags";

/* Editing several places at once. Only what they already have in common can
   be changed together: a kind they all share, a been-there they all agree on,
   a tag every one of them carries. Anything that differs between them is
   shown, so nothing is hidden, but left alone, because one answer written over
   several different ones is how a careful list gets flattened by accident. */

export interface Shared {
  /** The kind they all are, or null when they differ. */
  category: Category | null;
  /** Whether they have all been visited, all not, or null when mixed. */
  visited: boolean | null;
  /** Tags on every one of them. */
  commonTags: string[];
  /** Tags on some but not all, with how many carry each. */
  partialTags: { tag: string; count: number }[];
  /** Room for more tags on the fullest of them. */
  room: number;
}

export function sharedValues(places: readonly Place[]): Shared {
  const first = places[0];
  const category = first && places.every((p) => p.category === first.category) ? first.category : null;
  const visited = first && places.every((p) => p.visited === first.visited) ? first.visited : null;

  const counts = new Map<string, { tag: string; count: number }>();
  for (const place of places) {
    for (const tag of place.tags) {
      const key = cleanTag(tag).toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag: cleanTag(tag), count: 1 });
    }
  }

  const all = [...counts.values()];

  return {
    category,
    visited,
    commonTags: all.filter((t) => t.count === places.length).map((t) => t.tag),
    partialTags: all.filter((t) => t.count < places.length).sort((a, b) => b.count - a.count),
    room: MAX_TAGS - Math.max(0, ...places.map((p) => p.tags.length)),
  };
}

export interface BulkChanges {
  /** Only set when the places all shared one kind to begin with. */
  category?: Category;
  /** Only set when they all agreed to begin with. */
  visited?: boolean;
  addTags: string[];
  /** Only ever tags that were on all of them. */
  removeTags: string[];
}

/** One place with the changes laid over it — the whole body a PUT wants. */
export function applyChanges(place: Place, changes: BulkChanges): PlaceInput {
  const kept = place.tags.filter((tag) => !hasTag(changes.removeTags, tag));
  const added = changes.addTags.filter((tag) => !hasTag(kept, tag));

  return {
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    link: place.link,
    notes: place.notes,
    category: changes.category ?? place.category,
    visited: changes.visited ?? place.visited,
    tags: [...kept, ...added].slice(0, MAX_TAGS),
  };
}

export function hasChanges(changes: BulkChanges): boolean {
  return (
    changes.category !== undefined ||
    changes.visited !== undefined ||
    changes.addTags.length > 0 ||
    changes.removeTags.length > 0
  );
}
