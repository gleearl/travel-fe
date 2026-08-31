import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AuthLayout } from "../auth/AuthLayout";
import { useAuth } from "../auth/useAuth";
import { acceptInvitation, readInvitation } from "../lib/api/invitations";
import { ApiError } from "../lib/api/http";
import type { InvitationPreview } from "../lib/api/types";
import { Button } from "../ui/Button";

/* Where an emailed invitation link lands.

   The one screen in the app that has to work for somebody with no account:
   they clicked a link out of their mail and have no reason yet to trust it, so
   it names the trip and who sent it before asking them for anything at all.

   Four ways out, decided by who is holding the link:
   - signed in as the invited address → accept, and go to the trip
   - signed in as somebody else       → say which address it was meant for
   - signed out, address has an account → sign in
   - signed out, address has none        → create one, and registration takes
     the invitation up on its own, so they never come back here
*/
export function AcceptInvitation() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, status } = useAuth();

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    readInvitation(token)
      .then((found) => !cancelled && setInvitation(found))
      .catch((caught) => {
        if (cancelled) return;

        const status = caught instanceof ApiError ? caught.status : 0;

        /* Three different things go wrong here and they want three different
           sentences: a link that ran out of time can be replaced, one that was
           revoked cannot, and a network blip is worth simply retrying. */
        setProblem(
          status === 410
            ? {
                title: "That link has expired",
                body: "Invitations last two weeks. Ask whoever sent it for a fresh one.",
              }
            : status === 404
              ? {
                  title: "That link no longer works",
                  body: "It may have been used already, or taken back by whoever sent it.",
                }
              : {
                  title: "Couldn't open that invitation",
                  body: "The server didn't answer. Try the link again in a moment.",
                },
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      navigate(`/trips/${await acceptInvitation(token)}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach the server.");
      setBusy(false);
    }
  }

  if (problem) {
    return (
      <AuthLayout
        title={problem.title}
        intro={problem.body}
        footer={
          <Link to="/" className="text-ink underline underline-offset-4">
            Go to your trips
          </Link>
        }
      >
        <span />
      </AuthLayout>
    );
  }

  if (!invitation || status === "checking") {
    return (
      <div className="relative z-10 grid min-h-dvh place-items-center text-ink-3" aria-busy="true">
        <span className="stamp">Opening the invitation</span>
      </div>
    );
  }

  const invited = user !== null && user.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <AuthLayout
      title={invitation.tripName}
      intro={`${invitation.invitedBy} has shared this trip with you.`}
      footer={
        <Link to="/" className="text-ink underline underline-offset-4">
          Go to your trips
        </Link>
      }
    >
      <p className="text-[0.9375rem] leading-relaxed text-ink-2">
        {invitation.role === "editor"
          ? "You will be able to add places to it and change the ones already there."
          : "You will be able to see the trip and everything on it."}
      </p>

      <div className="mt-6">
        {invited ? (
          <>
            <Button variant="primary" full disabled={busy} onClick={accept}>
              {busy ? "Opening…" : "Accept and open the trip"}
            </Button>
            {error ? (
              <p role="alert" className="mt-3 text-[0.875rem] text-danger">
                {error}
              </p>
            ) : null}
          </>
        ) : user ? (
          /* Signed in as somebody else. Naming the address is the only thing
             that makes this fixable — usually a forwarded mail, or two
             accounts sharing a laptop. */
          <p className="rounded-card border border-rule bg-surface px-4 py-3.5 text-[0.9375rem] leading-relaxed text-ink-2">
            This invitation was sent to <span className="text-ink">{invitation.email}</span>, and you are
            signed in as <span className="text-ink">{user.email}</span>. Sign out and back in as that
            account to accept it.
          </p>
        ) : invitation.hasAccount ? (
          <Link
            to="/sign-in"
            state={{ from: `/invitations/${token}` }}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-card bg-ink px-4 text-[0.9375rem] font-medium text-paper"
          >
            Sign in to accept
          </Link>
        ) : (
          <>
            <Link
              to="/sign-up"
              state={{ from: `/invitations/${token}` }}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-card bg-ink px-4 text-[0.9375rem] font-medium text-paper"
            >
              Create an account to join
            </Link>
            {/* Signing up claims it — see the API's RegisterController — so
                there is nothing to come back here for. */}
            <p className="mt-3 text-[0.8125rem] text-ink-3">
              Use <span className="text-ink-2">{invitation.email}</span>, and the trip will be waiting.
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
