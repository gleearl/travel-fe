import { useState } from "react";
import { countLabel } from "../lib/format";
import { Button } from "../ui/Button";

/* What you can do to several places at once, pinned to the bottom of the list
   while you pick them. Delete asks first, here in the bar rather than in a
   dialog, so the places it is about stay in view above it. */
export function SelectionBar({
  count,
  total,
  allVisited,
  onSelectAll,
  onClear,
  onMarkVisited,
  onEdit,
  onDelete,
}: {
  count: number;
  /** How many are on screen, which is what "Select all" takes. */
  total: number;
  /** Every chosen place already been, so the button undoes it instead. */
  allVisited: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onMarkVisited: (visited: boolean) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const none = count === 0;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Selected places"
      className="sticky bottom-0 z-10 -mx-4 mt-3 border-t border-rule bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:-mx-5 lg:px-5"
    >
      {confirming ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-[0.9375rem] text-ink">
            Delete {countLabel(count, "place")}? This can’t be undone.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setConfirming(false)} className="flex-1" disabled={busy}>
              Keep them
            </Button>
            <button
              type="button"
              onClick={() => run(onDelete)}
              disabled={busy}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card bg-danger px-4 text-[0.9375rem] font-medium text-paper hover:bg-danger/90 disabled:opacity-45"
            >
              {busy ? "Deleting…" : `Delete ${countLabel(count, "place")}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="stamp text-ink" aria-live="polite">
              {none ? "Tap places to select" : `${count} selected`}
            </span>
            {count < total ? (
              <button type="button" onClick={onSelectAll} className="stamp min-h-9 px-1 text-ink-2 underline underline-offset-4">
                Select all {total}
              </button>
            ) : (
              <button type="button" onClick={onClear} className="stamp min-h-9 px-1 text-ink-2 underline underline-offset-4">
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={none || busy} onClick={() => run(() => onMarkVisited(!allVisited))}>
              {allVisited && !none ? "Mark not yet" : "Mark as been"}
            </Button>
            <Button size="sm" className="flex-1" disabled={none || busy} onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="danger" className="flex-1 border border-danger/35" disabled={none || busy} onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
