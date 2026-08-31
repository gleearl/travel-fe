/* Dates, written the way a person would write them on a trip.

   Deliberately not Intl.DateTimeFormat's `dateStyle`: it gives "Mar 4, 2026 –
   Mar 18, 2026" for a range inside one month, where what you want to read is
   "Mar 4 — 18". */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A "YYYY-MM-DD" from the API, parsed as a local date rather than UTC — the
 *  Date constructor reads a bare date string as midnight UTC, which in any
 *  timezone west of London is the day before. */
export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDateRange(start: string | null, end: string | null): string {
  const from = parseDate(start);
  const to = parseDate(end);

  if (!from && !to) return "No dates yet";
  if (from && !to) return `From ${short(from)}`;
  if (!from && to) return `Until ${short(to!)}`;

  const a = from!;
  const b = to!;
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${MONTHS[a.getMonth()]} ${a.getDate()} — ${b.getDate()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${short(a)} — ${short(b)}`;
  }
  return `${short(a)}, ${a.getFullYear()} — ${short(b)}, ${b.getFullYear()}`;
}

/** "14 places", and "1 place" — the plural that gets forgotten. */
export function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function short(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/* The letters that stand in for somebody's face.

   First and last, never the middle ones: an avatar is a circle about the size
   of a fingernail, and "AMLR" in it is a smudge. Taken with the spread operator
   rather than charAt so that a name outside the Latin alphabet — or one
   starting with an emoji — yields one whole character instead of half of a
   surrogate pair. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";

  const first = [...words[0]][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? "") : "";

  return (first + last).toUpperCase();
}
