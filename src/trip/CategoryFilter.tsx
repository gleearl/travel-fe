import type { Category } from "../lib/categories";
import { useKinds } from "../lib/useKinds";
import { KindChip } from "./KindChip";

/* Chips, one per kind in use, each in its own colour when it is on. Filtering
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
  const { kinds } = useKinds();

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind of place">
      {kinds
        .filter((kind) => (counts[kind.id] ?? 0) > 0)
        .map((kind) => (
          <KindChip key={kind.id} kind={kind} on={active.has(kind.id)} onClick={() => onToggle(kind.id)}>
            <span className="opacity-70">{counts[kind.id]}</span>
          </KindChip>
        ))}
    </div>
  );
}
