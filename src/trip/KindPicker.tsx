import { useId, useState } from "react";
import { contrastOnPaper, KIND_SWATCHES, type Category, type Kind } from "../lib/categories";
import { ApiError } from "../lib/api/http";
import { createKind, deleteKind, updateKind } from "../lib/api/kinds";
import { useKinds } from "../lib/useKinds";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { KindChip } from "./KindChip";

/* Choosing a place's kind — and, when none of them fits, making one.

   "New kind" sits at the end of the chips rather than somewhere in the trip's
   settings, because the moment you want "Karaoke" is the moment you are
   putting a karaoke bar on the list. It opens right here, under the chips,
   and the kind it makes is the one picked. A kind of the trip's own, once
   picked, can be renamed, recoloured or removed from the same spot. */
export function KindPicker({
  tripId,
  value,
  onChange,
  onKindSaved,
  onKindDeleted,
}: {
  tripId: number;
  value: Category;
  onChange: (category: Category) => void;
  onKindSaved: (kind: Kind) => void;
  /** Its places go back to Other. */
  onKindDeleted: (id: string) => void;
}) {
  const { kinds, kindOf } = useKinds();
  /* Null when closed, "new" while adding, or the kind being changed. */
  const [editing, setEditing] = useState<"new" | Kind | null>(null);

  const picked = kindOf(value);

  return (
    <div>
      <span className="stamp mb-1.5 block text-ink-2">Kind</span>
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((kind) => (
          <KindChip key={kind.id} kind={kind} on={picked.id === kind.id} onClick={() => onChange(kind.id)} />
        ))}
        {editing === null ? (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="stamp inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-dashed border-rule-strong px-3 text-ink-2 hover:border-ink-3 hover:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New kind
          </button>
        ) : null}
      </div>

      {editing === null && picked.custom ? (
        <button
          type="button"
          onClick={() => setEditing(picked)}
          className="mt-2 text-[0.8125rem] text-ink-2 underline decoration-rule-strong underline-offset-2 hover:text-ink"
        >
          Change the name or colour of {picked.label}
        </button>
      ) : null}

      {editing !== null ? (
        <KindEditor
          key={editing === "new" ? "new" : editing.id}
          tripId={tripId}
          kind={editing === "new" ? undefined : editing}
          taken={kinds.filter((k) => k.custom).map((k) => k.color)}
          onCancel={() => setEditing(null)}
          onSaved={(kind) => {
            onKindSaved(kind);
            onChange(kind.id);
            setEditing(null);
          }}
          onDeleted={(id) => {
            onKindDeleted(id);
            onChange("other");
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* A name, a colour, and a look at both together before saving. */
function KindEditor({
  tripId,
  kind,
  taken,
  onCancel,
  onSaved,
  onDeleted,
}: {
  tripId: number;
  /** Absent when this is a new kind. */
  kind?: Kind;
  /** Colours the trip's own kinds already have, so a new one starts on a fresh one. */
  taken: string[];
  onCancel: () => void;
  onSaved: (kind: Kind) => void;
  onDeleted: (id: string) => void;
}) {
  const [label, setLabel] = useState(kind?.label ?? "");
  const [color, setColor] = useState(
    kind?.color ?? (KIND_SWATCHES.find((s) => !taken.includes(s.color)) ?? KIND_SWATCHES[0]).color,
  );
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const colourLabel = useId();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const isSwatch = KIND_SWATCHES.some((s) => s.color === color);
  const contrast = contrastOnPaper(color);

  async function save() {
    if (label.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const input = { label: label.trim(), color };
      onSaved(kind ? await updateKind(tripId, kind.id, input) : await createKind(tripId, input));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(false);
    }
  }

  async function remove() {
    if (!kind) return;
    setBusy(true);
    try {
      await deleteKind(tripId, kind.id);
      onDeleted(kind.id);
    } catch {
      setError(new ApiError(0, "Couldn't remove that. Try again."));
      setBusy(false);
    }
  }

  return (
    <div
      role="group"
      aria-label={kind ? `Edit ${kind.label}` : "New kind"}
      className="mt-3 flex flex-col gap-4 rounded-card border border-rule bg-sunk/60 p-3"
    >
      <Field
        label="Name"
        placeholder="Karaoke, Onsen, Bakery"
        maxLength={24}
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        /* This sits inside the place form, where Enter would save the place.
           Here it means the kind. */
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        error={error?.fieldError("label")}
      />

      <div>
        <span id={colourLabel} className="stamp mb-1.5 block text-ink-2">
          Colour
        </span>
        <div role="radiogroup" aria-labelledby={colourLabel} className="flex flex-wrap gap-2">
          {KIND_SWATCHES.map((swatch) => (
            <Swatch
              key={swatch.color}
              color={swatch.color}
              name={swatch.name}
              on={color === swatch.color}
              onPick={() => setColor(swatch.color)}
            />
          ))}

          {/* Any colour at all, through the system picker. The swatch shows a
              colour wheel until a colour of your own is chosen, then that. */}
          <label
            className={[
              "relative grid h-7 w-7 cursor-pointer place-items-center rounded-pill",
              !isSwatch ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "",
            ].join(" ")}
            style={{
              background: isSwatch
                ? "conic-gradient(#c4231b, #975400, #5f6b0f, #147a3c, #0e6e8c, #1a5fd0, #4338ca, #9b2fae, #be185d, #c4231b)"
                : color,
            }}
            title="Your own colour"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Your own colour"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            {isSwatch ? (
              <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-pill bg-paper">
                <svg width="8" height="8" viewBox="0 0 10 10">
                  <path d="M5 1v8M1 5h8" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
            ) : null}
          </label>
        </div>
        {error?.fieldError("color") ? (
          <p className="mt-1.5 text-[0.8125rem] text-danger">{error.fieldError("color")}</p>
        ) : null}
      </div>

      {/* How it will look: the chip, the pin, and the name as a card writes it. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-3">
        <span className="stamp text-ink-3">Looks like</span>
        <KindChip kind={{ label: label.trim(), color }} on />
        <span
          aria-hidden="true"
          className="h-[18px] w-[18px] rounded-pill"
          style={{ background: color, border: "1.5px solid var(--color-paper)", boxShadow: "0 1px 3px rgb(28 26 23 / 0.3)" }}
        />
        <span className="stamp" style={{ color }}>
          {label.trim() || "New kind"}
        </span>
      </div>

      {/* A warning, not a refusal: it is your trip. But the name is written in
          this colour on every card, and a pale one makes it hard to read. */}
      {contrast < 4.5 ? (
        <p className="text-[0.8125rem] leading-snug text-ink-2">
          This colour is light for text on paper ({contrast.toFixed(1)}:1). Names written in it may be hard to
          read — a darker shade will read better.
        </p>
      ) : null}

      {error && Object.keys(error.errors).length === 0 ? (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {error.message}
        </p>
      ) : null}

      {confirmingRemove && kind ? (
        <div className="flex flex-col gap-2">
          <p className="text-[0.875rem] text-ink">
            Remove {kind.label}? Places of this kind go back to Other.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirmingRemove(false)} disabled={busy} className="flex-1">
              Keep it
            </Button>
            <Button size="sm" variant="danger" onClick={remove} disabled={busy} className="flex-1">
              {busy ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {kind ? (
            <Button size="sm" variant="danger" onClick={() => setConfirmingRemove(true)} disabled={busy}>
              Remove
            </Button>
          ) : null}
          <Button size="sm" onClick={onCancel} disabled={busy} className="flex-1">
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={save}
            disabled={busy || label.trim() === ""}
            className="flex-1"
          >
            {busy ? "Saving…" : kind ? "Save kind" : "Add kind"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Swatch({ color, name, on, onPick }: { color: string; name: string; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={name}
      title={name}
      onClick={onPick}
      className={[
        "grid h-7 w-7 place-items-center rounded-pill transition-shadow",
        on ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "",
      ].join(" ")}
      style={{ background: color }}
    >
      {on ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="var(--color-paper)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}
