import type { ReactNode } from "react";

/* A tag on a place — "Street food", "Cash only". Neutral on purpose: colour
   belongs to the category, and a second colour system on the same card would
   leave neither of them meaning anything. */
export function TagChip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-pill border border-rule bg-sunk px-2 py-0.5 text-[0.75rem] leading-snug text-ink-2 ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * A place's tags on one line: the first few, then "+N" for the rest — so a
 * place with twelve tags takes the same room on a card as one with three.
 */
export function TagList({ tags, limit = Infinity }: { tags: readonly string[]; limit?: number }) {
  if (tags.length === 0) return null;

  const shown = tags.slice(0, limit);
  const hidden = tags.length - shown.length;

  return (
    <ul className="flex flex-wrap gap-1" aria-label="Tags">
      {shown.map((tag) => (
        <li key={tag} className="min-w-0">
          <TagChip>{tag}</TagChip>
        </li>
      ))}
      {hidden > 0 ? (
        <li>
          <TagChip>
            <span aria-hidden="true">+{hidden}</span>
            <span className="sr-only">and {hidden} more</span>
          </TagChip>
        </li>
      ) : null}
    </ul>
  );
}
