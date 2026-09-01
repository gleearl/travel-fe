import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api/http";
import { invite, revokeInvitation } from "../lib/api/invitations";
import { fetchMembers, leaveTrip, removeMember, setMemberRole, type TripPeople } from "../lib/api/members";
import type { Collaborator, TripRole } from "../lib/api/types";
import { useChanged, useLiveUpdates } from "../live/useLiveUpdates";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Sheet } from "../ui/Sheet";
import { Stamp } from "../ui/Stamp";

/* Who is on a trip, and — for the owner — the controls that change that.

   Everyone can see the list. Only the owner sees email addresses, sees
   invitations that have not been taken up, and can do anything about either;
   the API answers that way whoever asks, so this only has to agree with it. */
export function PeopleSheet({
  tripId,
  role,
  onClose,
  onLeft,
}: {
  tripId: number;
  role: TripRole;
  onClose: () => void;
  /** Left the trip, so the screen behind this has nothing left to show. */
  onLeft: () => void;
}) {
  const [people, setPeople] = useState<TripPeople | null>(null);
  const [failed, setFailed] = useState(false);
  const isOwner = role === "owner";

  useEffect(() => {
    let cancelled = false;
    fetchMembers(tripId)
      .then((found) => !cancelled && setPeople(found))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const reload = useCallback(
    () => fetchMembers(tripId).then(setPeople).catch(() => setFailed(true)),
    [tripId],
  );

  /* The reason this screen wanted live updates most: an invitation is answered
     somewhere else entirely, and until now the only way to find out was to
     close this sheet and open it again. Accepting writes a member row, which
     touches the trip, which moves the stamp we are watching — and they cross
     from Invited to the list above it while the owner is looking at it. */
  const { updates } = useLiveUpdates();
  useChanged(updates?.trips[tripId] ?? null, reload);

  return (
    <Sheet title="People on this trip" onClose={onClose}>
      {failed ? (
        <p role="alert" className="text-[0.9375rem] text-danger">
          Couldn't load who's on this trip.
        </p>
      ) : null}

      {people === null && !failed ? (
        <p className="py-6 text-center text-ink-3" aria-busy="true">
          <span className="stamp">Loading</span>
        </p>
      ) : null}

      {people ? (
        <>
          {isOwner ? <InviteForm tripId={tripId} onSent={reload} /> : null}

          <ul className="flex flex-col divide-y divide-rule">
            <PersonRow person={people.owner} owner />
            {people.members.map((member) => (
              <PersonRow
                key={member.id}
                person={member}
                controls={
                  isOwner ? (
                    <OwnerControls tripId={tripId} member={member} onChanged={reload} />
                  ) : null
                }
              />
            ))}
          </ul>

          {people.invitations.length > 0 ? (
            <>
              <h3 className="stamp mt-6 mb-2 flex items-center gap-3 text-ink-3">
                Invited
                <span aria-hidden="true" className="h-px flex-1 bg-rule" />
              </h3>
              <ul className="flex flex-col divide-y divide-rule">
                {people.invitations.map((invitation) => (
                  <li key={invitation.id} className="flex items-center gap-2.5 py-2.5">
                    <Avatar name={invitation.user?.name ?? "?"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] text-ink">
                        {invitation.user?.name ?? "Someone"}
                      </p>
                      <Stamp>Waiting · {invitation.role}</Stamp>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => revokeInvitation(invitation.id).then(reload)}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {!isOwner ? (
            <div className="mt-6 border-t border-rule pt-4">
              <Button
                variant="danger"
                onClick={() => leaveTrip(tripId).then(onLeft)}
              >
                Leave this trip
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

function PersonRow({
  person,
  owner = false,
  controls,
}: {
  person: Collaborator;
  owner?: boolean;
  controls?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <Avatar name={person.name} owner={owner} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] text-ink">{person.name}</p>
        {/* Only ever present when the owner is the one reading this. */}
        {person.email ? <p className="truncate text-[0.8125rem] text-ink-3">{person.email}</p> : null}
      </div>
      {controls ?? <Stamp className="capitalize">{person.role}</Stamp>}
    </li>
  );
}

function OwnerControls({
  tripId,
  member,
  onChanged,
}: {
  tripId: number;
  member: Collaborator;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const change = async (action: Promise<unknown>) => {
    setBusy(true);
    try {
      await action;
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* One button rather than two chips: there are exactly two roles, so the
          only thing worth offering is the other one. */}
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          change(setMemberRole(tripId, member.id, member.role === "editor" ? "viewer" : "editor"))
        }
      >
        {member.role === "editor" ? "Make viewer" : "Make editor"}
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={busy}
        aria-label={`Remove ${member.name}`}
        onClick={() => change(removeMember(tripId, member.id))}
      >
        Remove
      </Button>
    </div>
  );
}

function InviteForm({ tripId, onSent }: { tripId: number; onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TripRole>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSent(null);
    try {
      await invite(tripId, email.trim(), role);
      setSent(`Invited ${email.trim()}. It is waiting in their trips list.`);
      setEmail("");
      onSent();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.fieldError("email") ?? caught.message)
          : "Couldn't reach the server.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-card border border-rule bg-sunk/60 p-3" noValidate>
      <Field
        label="Invite by email"
        type="email"
        inputMode="email"
        placeholder="them@example.com"
        hint="They need a Field Guide account already — the invitation waits in their trips list."
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error ?? undefined}
      />

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(["editor", "viewer"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={role === option}
            onClick={() => setRole(option)}
            className="stamp inline-flex min-h-9 items-center rounded-pill border px-3 capitalize"
            style={
              role === option
                ? { background: "var(--color-ink)", borderColor: "var(--color-ink)", color: "var(--color-paper)" }
                : { borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }
            }
          >
            {option}
          </button>
        ))}

        <Button type="submit" variant="primary" size="sm" className="ml-auto" disabled={busy || email.trim() === ""}>
          {busy ? "Sending…" : "Send"}
        </Button>
      </div>

      <p className="mt-2 text-[0.8125rem] text-ink-3">
        {role === "editor"
          ? "They will be able to add places and change the ones already here."
          : "They will be able to see the trip, and nothing more."}
      </p>

      {sent ? (
        <p role="status" className="mt-2 text-[0.8125rem] text-ink-2">
          {sent}
        </p>
      ) : null}
    </form>
  );
}
