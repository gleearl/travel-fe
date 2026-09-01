import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchUpdates, invitationsKey, tripsKey, type Updates } from "../lib/api/updates";
import { useAuth } from "../auth/useAuth";

/* How often to ask, while the tab is being looked at. One constant, because it
   is the only dial: everything else about how live the app feels follows from
   it. Five seconds is under the time it takes to wonder whether it worked, and
   at ninety bytes an answer it is cheaper than the favicon. */
const INTERVAL = 5000;

interface LiveValue {
  /** Null until the first answer arrives — "nothing yet", not "nothing". */
  updates: Updates | null;
  /** Ask now, without waiting for the next tick. */
  refresh: () => void;
}

/* The default is a real value rather than null, and `useLiveUpdates` does not
   throw when it is used outside the provider — unlike `useAuth`, which does.
   A screen rendered on its own is a screen that simply never hears about a
   change, which is what it did before any of this existed. Tests render these
   components bare and must keep working, with no timer running in jsdom. */
const LiveContext = createContext<LiveValue>({ updates: null, refresh: () => {} });

export function LiveUpdatesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<Updates | null>(null);

  /* Held in a ref so that asking early — on regaining focus — does not have to
     restart the loop, and so the loop itself is not rebuilt on every answer. */
  const askNow = useRef<() => void>(() => {});

  /* What the last answer said, folded into one string. A poll answers with a
     fresh object every time, and handing that to `setUpdates` would re-render
     every screen below every five seconds whether or not anything had moved —
     which is enough to disturb anything holding state of its own between
     renders. Most ticks say exactly what the one before it did. */
  const seen = useRef<string | null>(null);

  useEffect(() => {
    // Signed out there is nothing to watch, and no token to watch it with.
    if (!user) {
      seen.current = null;
      setUpdates(null);
      return;
    }

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /* A timeout scheduled after each answer, not an interval: on a slow
       connection an interval stacks requests on top of each other, and the one
       that answers last wins — which on a poll means the oldest state. */
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const next = await fetchUpdates();
          const digest = `${tripsKey(next)}|${invitationsKey(next)}`;

          if (!stopped && digest !== seen.current) {
            seen.current = digest;
            setUpdates(next);
          }
        } catch {
          /* Keep the last answer and try again on the next tick. A blip in the
             connection must not read as everything having been deleted. A 401
             is already handled below us: http.ts drops the token and raises
             SESSION_ENDED, which clears `user` and stops this effect. */
        }
      }

      if (!stopped) timer = setTimeout(tick, INTERVAL);
    };

    askNow.current = () => {
      if (stopped) return;
      clearTimeout(timer);
      void tick();
    };

    /* Coming back to the tab asks straight away rather than waiting out the
       rest of a tick, so returning to the app never shows a stale screen. */
    const onVisibility = () => {
      if (document.visibilityState === "visible") askNow.current();
    };
    document.addEventListener("visibilitychange", onVisibility);

    timer = setTimeout(tick, INTERVAL);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  const refresh = useCallback(() => askNow.current(), []);

  /* Held steady so that a re-render up here is not a re-render everywhere. */
  const value = useMemo(() => ({ updates, refresh }), [updates, refresh]);

  return <LiveContext value={value}>{children}</LiveContext>;
}

export function useLiveUpdates(): LiveValue {
  return useContext(LiveContext);
}

/**
 * Run `onChange` when `key` becomes something other than what it was.
 *
 * The first value seen is adopted silently: the screen has just fetched, so the
 * digest it arrives to is a description of what it is already showing. Acting
 * on it would mean every screen fetching itself twice on open.
 *
 * A null `key` is "nothing known yet" and is never a change.
 */
export function useChanged(key: string | number | null | undefined, onChange: () => void): void {
  const seen = useRef<string | number | null | undefined>(undefined);
  /* The callback is read through a ref so that an inline arrow — which every
     caller passes — does not re-run this on every render of the parent. */
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (key === null || key === undefined) return;

    if (seen.current === undefined) {
      seen.current = key;
      return;
    }

    if (seen.current === key) return;

    seen.current = key;
    latest.current();
  }, [key]);
}
