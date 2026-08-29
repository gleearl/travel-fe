import { useEffect, useState } from "react";

/** True while the query matches. Used to pick between the phone's bottom
 *  sheet and the desktop rail — one list component, two places to put it. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** The width at which the sheet becomes a rail. Matches Tailwind's `lg`. */
export const DESKTOP = "(min-width: 1024px)";
