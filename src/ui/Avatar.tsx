import { initials } from "../lib/format";
import type { Collaborator, Person } from "../lib/api/types";

/* Somebody, as a circle with their letters in it.

   No colour of its own, on purpose. The palette spends one saturated hue per
   *kind of place*, and a green avatar beside a green pin would read as if it
   meant "sight". Instead this borrows the idiom the app already speaks: the
   owner is inked in, everyone else sits on paper — the same filled-versus-
   hollow distinction that separates a place you have been from one you have
   not. Identity comes from the letters. */
export function Avatar({
  name,
  owner = false,
  size = 26,
  title,
}: {
  name: string;
  owner?: boolean;
  size?: number;
  /** Overrides the tooltip, which is otherwise just the name. */
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      className={[
        "grid shrink-0 place-items-center rounded-pill border font-semibold select-none",
        owner ? "border-ink bg-ink text-paper" : "border-rule bg-accent-soft text-ink",
      ].join(" ")}
      style={{
        width: size,
        height: size,
        // Two letters have to fit inside the circle at any size it is used at.
        fontSize: Math.round(size * 0.38),
        lineHeight: 1,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* The people on a trip, overlapping, most-important first. Also the button
   that opens the people sheet — the avatars are the obvious thing to press to
   ask "who is on this", so making them something else would be a second
   control for the same question. */
export function AvatarStack({
  owner,
  collaborators,
  onClick,
  size = 26,
  max = 3,
}: {
  owner: Person | null;
  collaborators: Collaborator[];
  onClick?: () => void;
  size?: number;
  max?: number;
}) {
  const everyone = [
    ...(owner ? [{ ...owner, isOwner: true }] : []),
    ...collaborators.map((person) => ({ ...person, isOwner: false })),
  ];

  if (everyone.length === 0) return null;

  const shown = everyone.slice(0, max);
  const rest = everyone.length - shown.length;

  const faces = (
    <>
      {shown.map((person) => (
        // Overlapped by a third, which reads as a group without hiding a letter.
        <span key={person.id} style={{ marginLeft: person === shown[0] ? 0 : -size / 3 }}>
          <Avatar name={person.name} owner={person.isOwner} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="stamp grid place-items-center rounded-pill border border-rule bg-surface text-ink-2"
          style={{ height: size, paddingInline: size / 4, marginLeft: -size / 3, fontSize: Math.round(size * 0.34) }}
        >
          +{rest}
        </span>
      ) : null}
    </>
  );

  const label = `${everyone.length} ${everyone.length === 1 ? "person" : "people"} on this trip`;

  if (!onClick) {
    return (
      <span className="flex items-center" aria-label={label}>
        {faces}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center rounded-pill p-0.5 transition-colors hover:bg-accent-soft"
    >
      {faces}
    </button>
  );
}
