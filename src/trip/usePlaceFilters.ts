import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_IDS, type Category } from "../lib/categories";
import { hasTag, sameTag, tagsInUse } from "../lib/tags";
import type { Place } from "../lib/api/types";

/**
 * The two rows of filter chips — kinds and tags — and what survives them.
 * Shared by the trip screen and a trip opened from its share link, so the two
 * can never filter differently.
 */
export function usePlaceFilters(places: Place[]) {
  const [active, setActive] = useState<Set<Category>>(new Set());
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const counts = useMemo(() => {
    const tally = Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0])) as Record<Category, number>;
    for (const place of places) tally[place.category] += 1;
    return tally;
  }, [places]);

  const tags = useMemo(() => tagsInUse(places), [places]);

  /* An empty filter means everything. Keeping "all" as the absence of a
     choice rather than a sixth chip is what stops the two from disagreeing.

     Within a row, any chip matches — Food or Cafe, Street food or Night market
     — the same rule for both. Across the two rows, both must hold: "Food" and
     "Street food" is street food, not every place that is either. */
  const visible = useMemo(
    () =>
      places.filter(
        (p) =>
          (active.size === 0 || active.has(p.category)) &&
          (activeTags.length === 0 || activeTags.some((tag) => hasTag(p.tags, tag))),
      ),
    [places, active, activeTags],
  );

  /* A tag that no place carries any more — removed from its last place, by
     you or someone else — would be a filter you can't see and can't turn off,
     hiding everything. Dropped as soon as it stops being offered. */
  useEffect(() => {
    setActiveTags((current) => {
      const kept = current.filter((tag) => tags.some((t) => sameTag(t.tag, tag)));
      return kept.length === current.length ? current : kept;
    });
  }, [tags]);

  const toggleCategory = useCallback((category: Category) => {
    setActive((current) => {
      const next = new Set(current);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((current) =>
      hasTag(current, tag) ? current.filter((t) => !sameTag(t, tag)) : [...current, tag],
    );
  }, []);

  return { counts, tags, active, activeTags, visible, toggleCategory, toggleTag };
}
