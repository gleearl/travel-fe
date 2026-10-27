/* Kinds of place. Every trip has the built-in six; a trip can add its own on
   top — "Karaoke", "Onsen" — each with a name and a colour somebody chose.

   A built-in kind's `color` is a CSS custom property rather than a hex value:
   that palette lives in theme.css, and a pin drawn from a literal here would
   drift from it. A trip's own kinds carry the hex they were saved with. */

export interface Kind {
  id: string;
  label: string;
  color: string;
  /** Added by the trip, so it can be renamed, recoloured or removed. */
  custom?: boolean;
}

/** In the order they appear as chips. Other is always last, whatever is added. */
export const BUILT_IN_KINDS: readonly Kind[] = [
  { id: "food", label: "Food", color: "var(--color-food)" },
  { id: "cafe", label: "Cafe", color: "var(--color-cafe)" },
  { id: "sight", label: "Sight", color: "var(--color-sight)" },
  { id: "shopping", label: "Shopping", color: "var(--color-shopping)" },
  { id: "club", label: "Club", color: "var(--color-club)" },
  { id: "other", label: "Other", color: "var(--color-other)" },
];

/** A place's kind: a built-in id, or one of its trip's own. */
export type Category = string;

const OTHER = BUILT_IN_KINDS[BUILT_IN_KINDS.length - 1];

/** The built-in kinds with a trip's own slotted in before Other. */
export function withTripKinds(own: readonly Kind[]): Kind[] {
  return [...BUILT_IN_KINDS.slice(0, -1), ...own.map((kind) => ({ ...kind, custom: true })), OTHER];
}

/** An unknown kind — removed, or from another trip — reads as Other rather than a pin with no colour. */
export function kindIn(kinds: readonly Kind[], id: string | null | undefined): Kind {
  return kinds.find((kind) => kind.id === id) ?? OTHER;
}

/** For anything outside a trip, where only the built-in kinds exist. */
export function categoryOf(id: string | null | undefined): Kind {
  return kindIn(BUILT_IN_KINDS, id);
}

/* What a new kind is offered in. Eight hues the built-in six don't already
   use, and each as dark as they are — every one reads as text on paper at
   5:1 or better, because a kind is always written as well as coloured. A
   colour of your own is allowed too; see contrastOnPaper for the warning. */
export const KIND_SWATCHES = [
  { name: "Teal", color: "#0f766e" },
  { name: "Rose", color: "#be185d" },
  { name: "Orange", color: "#b4480c" },
  { name: "Indigo", color: "#4338ca" },
  { name: "Olive", color: "#5f6b0f" },
  { name: "Brown", color: "#8a4b2a" },
  { name: "Ocean", color: "#0e6e8c" },
  { name: "Plum", color: "#7a2e5f" },
] as const;

/** --color-paper, which every kind is read against. */
const PAPER = "#faf7f2";

/** WCAG contrast of a hex colour on paper. Below 4.5 a kind's name gets hard to read. */
export function contrastOnPaper(hex: string): number {
  const luminance = (value: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(value.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [luminance(hex), luminance(PAPER)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
