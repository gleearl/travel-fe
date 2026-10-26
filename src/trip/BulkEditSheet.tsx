import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CATEGORIES, categoryOf, type Category } from "../lib/categories";
import { hasChanges, sharedValues, type BulkChanges } from "../lib/bulk";
import { hasTag } from "../lib/tags";
import type { Place } from "../lib/api/types";
import { countLabel } from "../lib/format";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import { TagPicker } from "./TagPicker";

/* Several places, edited as one. Each section is either open — every place
   agrees, so one answer fits them all — or locked, saying what differs and
   leaving it be. See lib/bulk for why mixed values are never overwritten. */
export function BulkEditSheet({
  places,
  onClose,
  onSave,
}: {
  places: Place[];
  onClose: () => void;
  /** Resolves once every place is saved; rejects with how many were not. */
  onSave: (changes: BulkChanges) => Promise<void>;
}) {
  const shared = useMemo(() => sharedValues(places), [places]);
  const [category, setCategory] = useState<Category | null>(shared.category);
  const [visited, setVisited] = useState<boolean | null>(shared.visited);
  const [removeTags, setRemoveTags] = useState<string[]>([]);
  const [addTags, setAddTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changes: BulkChanges = {
    category: category !== null && category !== shared.category ? category : undefined,
    visited: visited !== null && visited !== shared.visited ? visited : undefined,
    addTags,
    removeTags,
  };

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(changes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save those changes. Try again.");
      setBusy(false);
    }
  }

  const n = places.length;
  const kinds = [...new Set(places.map((p) => categoryOf(p.category).label))];

  return (
    <Sheet
      title={`Edit ${countLabel(n, "place")}`}
      onClose={onClose}
      focusField={false}
      footer={
        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy || !hasChanges(changes)} className="flex-1">
            {busy ? "Saving…" : `Save to ${countLabel(n, "place")}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          Changes here apply to all {n}. Anything they don’t already share is shown but can’t be changed
          together.
        </p>

        <Section label="Kind">
          {shared.category ? (
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const on = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(c.id)}
                    className="stamp inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3"
                    style={
                      on
                        ? { background: c.color, borderColor: c.color, color: "var(--color-paper)" }
                        : { borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-pill"
                      style={{ background: on ? "var(--color-paper)" : c.color }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <Locked reason="Pick places of one kind to change this.">Mixed: {kinds.join(", ")}</Locked>
          )}
        </Section>

        <Section label="Been there">
          {shared.visited !== null ? (
            <div className="inline-flex rounded-card border border-rule p-0.5" role="group" aria-label="Been there">
              {[
                { value: false, label: "Not yet" },
                { value: true, label: "Been" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={visited === option.value}
                  onClick={() => setVisited(option.value)}
                  className={[
                    "min-h-9 rounded-[6px] px-4 text-[0.875rem]",
                    visited === option.value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <Locked reason="Pick places that are all been, or all not yet, to change this.">
              Mixed: some been, some not yet
            </Locked>
          )}
        </Section>

        <Section label={`Tags on all ${n}`}>
          {shared.commonTags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Tags on all ${n}`}>
              {shared.commonTags.map((tag) => {
                const removing = hasTag(removeTags, tag);
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      aria-pressed={removing}
                      aria-label={removing ? `Keep ${tag}` : `Remove ${tag} from all`}
                      onClick={() =>
                        setRemoveTags((current) =>
                          removing ? current.filter((t) => t !== tag) : [...current, tag],
                        )
                      }
                      className={[
                        "inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-[0.8125rem]",
                        removing
                          ? "border border-dashed border-danger text-danger"
                          : "bg-ink text-paper hover:bg-ink/85",
                      ].join(" ")}
                    >
                      <span className={removing ? "line-through" : undefined}>{tag}</span>
                      {removing ? (
                        <span className="stamp">Undo</span>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[0.875rem] text-ink-3">No tag is on every one of them.</p>
          )}
        </Section>

        {shared.partialTags.length > 0 ? (
          <Section label="On some of them">
            <Locked reason="Only some of these places have these, so they can't be changed together.">
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags on some of them">
                {shared.partialTags.map(({ tag, count }) => (
                  <li
                    key={tag}
                    className="inline-flex min-h-8 items-center gap-1 rounded-pill border border-dashed border-rule-strong px-2.5 text-[0.8125rem] text-ink-2"
                  >
                    {tag}
                    <span className="tabular-nums">
                      · {count} of {n}
                    </span>
                  </li>
                ))}
              </ul>
            </Locked>
          </Section>
        ) : null}

        <TagPicker
          label={`Add tags to all ${n}`}
          value={addTags}
          onChange={setAddTags}
          exclude={shared.commonTags.filter((t) => !hasTag(removeTags, t))}
          max={Math.max(0, shared.room + removeTags.length)}
        />

        {error ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="stamp mb-1.5 text-ink-2">{label}</h3>
      {children}
    </section>
  );
}

/* A value that differs between the places, shown as it is with the reason it
   can't be changed — rather than a control that is simply missing, which reads
   as something that failed to load. */
function Locked({ children, reason }: { children: ReactNode; reason: string }) {
  return (
    <div className="rounded-card border border-rule bg-sunk/60 px-3 py-2.5">
      <div className="flex items-start gap-2 text-[0.875rem] text-ink-2">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="mt-0.5 shrink-0">
          <rect x="2.5" y="6" width="9" height="6.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <p className="mt-1.5 pl-[22px] text-[0.8125rem] text-ink-3">{reason}</p>
    </div>
  );
}
