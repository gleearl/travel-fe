/* The five kinds of place, in the order they appear as filter chips.
   `color` is a CSS custom property rather than a hex value: the palette lives
   in theme.css, and a pin drawn from a literal here would drift from it. */

export const CATEGORIES = [
  { id: "food", label: "Food", color: "var(--color-food)" },
  { id: "cafe", label: "Cafe", color: "var(--color-cafe)" },
  { id: "sight", label: "Sight", color: "var(--color-sight)" },
  { id: "shopping", label: "Shopping", color: "var(--color-shopping)" },
  { id: "other", label: "Other", color: "var(--color-other)" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as readonly Category[];

export function categoryOf(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
