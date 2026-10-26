import { hasTag } from "../lib/tags";

/* The tags on this trip, as filter chips — only the ones some place actually
   carries, most used first. One line that scrolls sideways rather than wraps:
   a trip can pick up dozens of tags, and the list below must not be pushed off
   the sheet to make room for them. */
export function TagFilter({
  tags,
  active,
  onToggle,
}: {
  tags: { tag: string; count: number }[];
  /** Empty means everything, the same as the category chips. */
  active: string[];
  onToggle: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Filter by tag"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:-mx-5 lg:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tags.map(({ tag, count }) => {
        const on = hasTag(active, tag);

        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            aria-pressed={on}
            className={[
              "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-pill border px-2.5 text-[0.8125rem] whitespace-nowrap transition-colors",
              on ? "border-ink bg-ink text-paper" : "border-rule bg-surface text-ink-2 hover:border-rule-strong",
            ].join(" ")}
          >
            {tag}
            <span className="opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
