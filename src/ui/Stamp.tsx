import type { ReactNode } from "react";

/* The small-caps meta line — a category, a date range, "14 places". Wide
   tracking and a size below the body text: it is a label on the thing, not
   part of what the thing says. */
export function Stamp({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  /** A CSS colour, normally a category's custom property. */
  color?: string;
  className?: string;
}) {
  return (
    <span className={`stamp ${color ? "" : "text-ink-3"} ${className}`} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}
