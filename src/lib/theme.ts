import { useSyncExternalStore } from "react";

/* Light, dark, or whatever the device is set to.

   The choice is per device, in localStorage, rather than on the account: a
   phone that goes dark at sunset and a desk monitor that never does are both
   right, for the same person. Nothing is stored for "device", so a new
   browser starts there.

   index.html runs the same resolution inline before the first paint, so the
   page never flashes cream on its way to dark. This module takes over from
   there: it follows the device when it changes, and applies a new choice. */

export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";

/** Also named in index.html's inline script. */
export const THEME_KEY = "fieldguide.theme";

/** --color-paper in each theme, for the browser's own chrome. */
const CHROME: Record<Theme, string> = { light: "#faf7f2", dark: "#171512" };

const listeners = new Set<() => void>();
const media = () => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function resolve(preference: ThemePreference): Theme {
  if (preference !== "system") return preference;
  return media()?.matches ? "dark" : "light";
}

function apply(): void {
  const theme = resolve(readPreference());
  const root = document.documentElement;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", CHROME[theme]);
  listeners.forEach((listener) => listener());
}

let watching = false;
function watch(): void {
  if (watching) return;
  watching = true;
  media()?.addEventListener("change", apply);
  /* A choice made in another tab. */
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) apply();
  });
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch {
    /* Private mode: the choice holds for this page, and that is all. */
  }
  apply();
}

function subscribe(listener: () => void) {
  watch();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** One string, so useSyncExternalStore can compare snapshots. */
const snapshot = () => `${readPreference()}:${resolve(readPreference())}`;

export function useTheme(): { preference: ThemePreference; theme: Theme; setPreference: typeof setThemePreference } {
  const [preference, theme] = useSyncExternalStore(subscribe, snapshot, () => "system:light").split(":") as [
    ThemePreference,
    Theme,
  ];
  return { preference, theme, setPreference: setThemePreference };
}

/** Called once at start-up, in case the inline script could not run. */
export function initTheme(): void {
  apply();
  watch();
}
