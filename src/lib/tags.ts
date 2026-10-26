/* Tags: the short words on top of a place's one category — "Street food",
   "Night market", "Cash only".

   This list is only what the form *suggests*. Anyone can type a tag of their
   own, and the API stores whatever is sent, so adding a suggestion is one line
   here and nothing else: no migration, no API change, and every place that was
   already tagged with it keeps working.

   Grouped so the picker stays readable as the list grows; a group is a heading
   in the form and nothing more. Order within a group is the order shown. */

export const TAG_GROUPS = [
  {
    label: "Food",
    tags: ["Street food", "Night market", "Local favourite", "Must try", "Vegetarian friendly", "Late night"],
  },
  {
    label: "Vibe",
    tags: ["Hidden gem", "Rooftop", "Great view", "Quiet", "Photo spot"],
  },
  {
    label: "Practical",
    tags: ["Cash only", "Book ahead", "Expect a queue", "Free entry", "Kid friendly"],
  },
] as const;

/** Mirrors the API's limits, so the form stops before the server refuses. */
export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 32;

/** " street  food " → "street food". The same tidying the API does. */
export function cleanTag(tag: string): string {
  return tag.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
}

/** "Street food" and "street FOOD" are one tag. */
export function sameTag(a: string, b: string): boolean {
  return cleanTag(a).toLowerCase() === cleanTag(b).toLowerCase();
}

export function hasTag(tags: readonly string[], tag: string): boolean {
  return tags.some((t) => sameTag(t, tag));
}

/**
 * Every tag used on these places, most used first — what the filter offers.
 * Spelling is taken from the first place that used it.
 */
export function tagsInUse(places: readonly { tags: readonly string[] }[]): { tag: string; count: number }[] {
  const tally = new Map<string, { tag: string; count: number }>();

  for (const place of places) {
    for (const tag of place.tags) {
      const key = cleanTag(tag).toLowerCase();
      const entry = tally.get(key);
      if (entry) entry.count += 1;
      else tally.set(key, { tag: cleanTag(tag), count: 1 });
    }
  }

  return [...tally.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
