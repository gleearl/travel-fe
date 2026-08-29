import { CATEGORIES, type Category } from "../lib/categories";

/* Chips, one per category, each in its own colour when it is on. Filtering
   here filters the map too — the two are one list seen two ways. */
export function CategoryFilter({
  active,
  onToggle,
  counts,
}: {
  /** Empty means everything; there is no separate "all" state to keep in step. */
  active: Set<Category>;
  onToggle: (category: Category) => void;
  counts: Record<Category, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind of place">
      {CATEGORIES.filter((category) => counts[category.id] > 0).map((category) => {
        const on = active.has(category.id);

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onToggle(category.id)}
            aria-pressed={on}
            className="stamp inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 transition-colors"
            style={
              on
                ? { background: category.color, borderColor: category.color, color: "var(--color-paper)" }
                : { borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }
            }
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-pill"
              style={{ background: on ? "var(--color-paper)" : category.color }}
            />
            {category.label}
            <span className="opacity-70">{counts[category.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
