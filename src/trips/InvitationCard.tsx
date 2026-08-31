import { useState } from "react";
import { acceptInvitation, declineInvitation } from "../lib/api/invitations";
import { formatDateRange } from "../lib/format";
import type { Invitation } from "../lib/api/types";
import { Button } from "../ui/Button";
import { Stamp } from "../ui/Stamp";

/* A trip somebody has asked you onto.

   Shaped like a TripCard on purpose — same rule, same serif name, same stamps
   along the bottom — because it is about to become one. The difference is that
   it is not a link: accepting is what grants access, and a card that looked
   pressable would lead straight to a 404. */
export function InvitationCard({
  invitation,
  onAccepted,
  onDeclined,
}: {
  invitation: Invitation;
  onAccepted: () => void;
  onDeclined: () => void;
}) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [failed, setFailed] = useState(false);

  async function answer(which: "accept" | "decline") {
    setBusy(which);
    setFailed(false);
    try {
      if (which === "accept") {
        await acceptInvitation(invitation.id);
        onAccepted();
      } else {
        await declineInvitation(invitation.id);
        onDeclined();
      }
    } catch {
      /* The card stays exactly where it was. Nothing here is optimistic:
         answering an invitation is one press, and quietly showing the wrong
         outcome would be worse than asking for it again. */
      setFailed(true);
      setBusy(null);
    }
  }

  return (
    <li className="motion-safe:rise rounded-card border border-rule-strong bg-surface px-4 py-4 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[1.3125rem] leading-tight text-ink">{invitation.trip.name}</h3>
        <Stamp className="shrink-0">{invitation.role === "editor" ? "Can edit" : "View only"}</Stamp>
      </div>

      {invitation.trip.destination ? (
        <p className="mt-1 text-[0.9375rem] text-ink-2">{invitation.trip.destination}</p>
      ) : null}

      <p className="mt-1.5">
        <Stamp>
          {invitation.invitedBy ? `${invitation.invitedBy.name} invited you` : "You were invited"}
        </Stamp>
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-rule pt-3">
        <Stamp>{formatDateRange(invitation.trip.startDate, invitation.trip.endDate)}</Stamp>

        <div className="ml-auto flex gap-1.5">
          <Button size="sm" disabled={busy !== null} onClick={() => answer("decline")}>
            {busy === "decline" ? "…" : "Decline"}
          </Button>
          <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => answer("accept")}>
            {busy === "accept" ? "Joining…" : "Accept"}
          </Button>
        </div>
      </div>

      {failed ? (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
          Couldn't answer that just now. Try again.
        </p>
      ) : null}
    </li>
  );
}
