import type { ReactNode } from "react";

/* An empty list is a moment, not a gap. A drawn mark, a line saying what
   would be here, and the button that starts it — never a blank panel. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Compass />
      <h2 className="mt-5 font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 max-w-xs text-[0.9375rem] leading-relaxed text-ink-2">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/* A compass rose, drawn rather than fetched: one needle, one ring, and the
   four ticks. Ink at low opacity so it reads as printed on the paper. */
function Compass() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="text-ink/25">
      <circle cx="28" cy="28" r="21" stroke="currentColor" strokeWidth="1" />
      <circle cx="28" cy="28" r="26.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 5" />
      <path d="M28 13.5 L32.5 28 L28 42.5 L23.5 28 Z" fill="currentColor" opacity="0.55" />
      <path d="M28 13.5 L32.5 28 L28 28 Z" fill="currentColor" />
      <circle cx="28" cy="28" r="1.75" fill="currentColor" />
    </svg>
  );
}
