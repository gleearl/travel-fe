import type { ReactNode } from "react";
import type { Kind } from "../lib/categories";

/* One kind as a pressable chip: a dot of its colour while off, filled with it
   while on. The filter, the place form and bulk edit all draw kinds this way,
   so a kind looks the same wherever it is picked. */
export function KindChip({
  kind,
  on,
  onClick,
  children,
}: {
  kind: Pick<Kind, "label" | "color">;
  on: boolean;
  onClick?: () => void;
  /** After the name — a count, in the filter. */
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="stamp inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 transition-colors"
      style={
        on
          ? { background: kind.color, borderColor: kind.color, color: "var(--color-paper)" }
          : { borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }
      }
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-pill"
        style={{ background: on ? "var(--color-paper)" : kind.color }}
      />
      {kind.label || "New kind"}
      {children}
    </button>
  );
}
