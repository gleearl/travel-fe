import { request } from "./http";

/**
 * What has changed for this account — the whole answer, in about ninety bytes.
 *
 * Deliberately not wrapped in `data` like the resources are: this is not a
 * resource, it is a poll, and every byte here is paid for every few seconds.
 */
export interface Updates {
  /** Trip id → when it last changed, epoch seconds. */
  trips: Record<number, number>;
  invitations: {
    /** How many are waiting. Not decoration — see the note below. */
    count: number;
    latest: number | null;
  };
}

interface RawUpdates {
  trips?: Record<string, number>;
  invitations?: { count?: number; latest?: number | null };
}

export async function fetchUpdates(): Promise<Updates> {
  const raw = await request<RawUpdates>("/api/updates");

  const trips: Record<number, number> = {};
  for (const [id, at] of Object.entries(raw.trips ?? {})) trips[Number(id)] = Number(at);

  return {
    trips,
    invitations: {
      count: Number(raw.invitations?.count ?? 0),
      latest: raw.invitations?.latest ?? null,
    },
  };
}

/* ── Reading a digest ──────────────────────────────────────────────────────

   Two helpers rather than comparing by hand at each call site, because both
   comparisons have a trap in them.

   A trip you were removed from, or one that was deleted, is not a stamp that
   changed — it is a key that is no longer there. So `tripsKey` folds the ids
   into the value it returns, and a trip arriving or leaving moves it just as a
   trip changing does.

   Invitations collapse to one stamp, so a *removal* can leave it untouched:
   revoke the older of two and `latest` is still the newer one's. The count is
   what moves whenever the set does. */

/** One value that changes whenever anything about your trips does. */
export function tripsKey(updates: Updates | null): string | null {
  if (updates === null) return null;

  return Object.entries(updates.trips)
    .map(([id, at]) => `${id}:${at}`)
    .sort()
    .join(",");
}

/** One value that changes whenever what is waiting on you does. */
export function invitationsKey(updates: Updates | null): string | null {
  if (updates === null) return null;

  return `${updates.invitations.count}:${updates.invitations.latest ?? 0}`;
}
