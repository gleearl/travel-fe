import { Link } from "react-router";
import { countLabel, formatDateRange } from "../lib/format";
import type { Trip } from "../lib/api/types";
import { Stamp } from "../ui/Stamp";

/* An entry in the guide: the name in the serif, where it is underneath, and
   the two facts worth knowing at a glance stamped along the bottom. */
export function TripCard({ trip, index }: { trip: Trip; index: number }) {
  return (
    <li
      className="motion-safe:rise"
      /* Each card arrives a beat after the one above it. 40ms is enough to
         read as a sequence and short enough that a long list still lands
         together. */
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Link
        to={`/trips/${trip.id}`}
        className="group block rounded-card border border-rule bg-surface px-4 py-4 shadow-card transition-colors hover:border-rule-strong"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[1.3125rem] leading-tight text-ink">{trip.name}</h3>
          <svg
            width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"
            className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
          >
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {trip.destination ? (
          <p className="mt-1 text-[0.9375rem] text-ink-2">{trip.destination}</p>
        ) : null}

        <div className="mt-3.5 flex items-center gap-2.5 border-t border-rule pt-3">
          <Stamp>{formatDateRange(trip.startDate, trip.endDate)}</Stamp>
          <span aria-hidden="true" className="text-ink-3/50">·</span>
          <Stamp>{countLabel(trip.placeCount, "place")}</Stamp>
        </div>
      </Link>
    </li>
  );
}
