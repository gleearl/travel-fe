import { useState } from "react";
import { cleanTag, hasTag, MAX_TAG_LENGTH, MAX_TAGS, TAG_GROUPS } from "../lib/tags";
import { Field } from "../ui/Field";

/* Choosing a place's tags: the ones it has, as chips you can take off; a field
   to type any tag at all; and the suggested ones, grouped, to tap.

   Built to take a much longer suggestion list than today's. Typing filters the
   suggestions down to what matches, so finding one never means scanning them
   all, and a group with nothing left to offer disappears rather than showing
   an empty heading. */
export function TagPicker({
  value,
  onChange,
  label = "Tags",
  exclude = [],
  max = MAX_TAGS,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  /** Tags already there by some other route, so not worth suggesting again. */
  exclude?: readonly string[];
  /** How many more this can take — fewer than MAX_TAGS when some are already on. */
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const full = value.length >= max;

  function add(tag: string) {
    const clean = cleanTag(tag);
    if (clean === "" || full || hasTag(value, clean) || hasTag(exclude, clean)) return;
    onChange([...value, clean]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const query = draft.trim().toLowerCase();
  const groups = TAG_GROUPS.map((group) => ({
    label: group.label,
    tags: group.tags.filter(
      (tag) => !hasTag(value, tag) && !hasTag(exclude, tag) && tag.toLowerCase().includes(query),
    ),
  })).filter((group) => group.tags.length > 0);

  /* What you typed, offered as a tag of its own — unless it already is one,
     in which case the suggestion below is the thing to press. */
  const custom = cleanTag(draft);
  const offerCustom =
    custom !== "" &&
    !hasTag(value, custom) &&
    !hasTag(exclude, custom) &&
    !TAG_GROUPS.some((g) => hasTag(g.tags, custom));

  return (
    <div>
      <Field
        label={label}
        value={draft}
        maxLength={MAX_TAG_LENGTH}
        disabled={full}
        placeholder={full ? `That's the most a place can have (${MAX_TAGS})` : "Type to find or add a tag"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          /* Enter adds rather than submitting the whole place form, and a comma
             is how people type a list anyway. */
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
      />

      {value.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags on this place">
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-ink px-3 text-[0.8125rem] text-paper hover:bg-ink/85"
              >
                {tag}
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!full ? (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {offerCustom ? (
            <div>
              <button
                type="button"
                onClick={() => add(custom)}
                className="inline-flex min-h-9 items-center gap-1 rounded-pill border border-dashed border-ink-3 px-3 text-[0.8125rem] text-ink hover:bg-accent-soft"
              >
                <span aria-hidden="true">+</span> Add “{custom}”
              </button>
            </div>
          ) : null}

          {groups.map((group) => (
            <div key={group.label}>
              <span className="stamp mb-1 block text-ink-3">{group.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => add(tag)}
                    className="inline-flex min-h-9 items-center rounded-pill border border-rule px-3 text-[0.8125rem] text-ink-2 hover:border-rule-strong hover:bg-accent-soft hover:text-ink"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
