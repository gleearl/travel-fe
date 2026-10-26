import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill } from "@simplewebauthn/browser";
import { Link, Navigate, useLocation } from "react-router";
import { ApiError } from "../lib/api/http";
import { cancelPasskeyPrompt, wasCancelled } from "../lib/api/passkeys";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { PasskeyMark } from "../ui/PasskeyMark";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";

const PASSKEY_REFUSED = "That passkey isn't recognised. Try your password instead.";

export function SignIn() {
  const { user, signIn, signInWithPasskey } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<"password" | "passkey" | null>(null);
  const [passkeys] = useState(() => browserSupportsWebAuthn());

  /* Passkeys offered in the email field's own suggestions, next to saved
     emails, for browsers that can. The request waits silently until one is
     picked, and is abandoned when the page goes or a password is sent. */
  useEffect(() => {
    let live = true;

    void browserSupportsWebAuthnAutofill().then((supported) => {
      if (!supported || !live) return;
      signInWithPasskey({ autofill: true }).catch((caught: unknown) => {
        if (live && !wasCancelled(caught)) setError(passkeyError(caught));
      });
    });

    return () => {
      live = false;
      cancelPasskeyPrompt();
    };
  }, [signInWithPasskey]);

  // Already signed in — usually a back button landing here.
  if (user) return <Navigate to={(location.state as { from?: string })?.from ?? "/"} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    cancelPasskeyPrompt();
    setBusy("password");
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(null);
    }
  }

  async function usePasskey() {
    // The autofill request holds the device; only one prompt can be open.
    cancelPasskeyPrompt();
    setBusy("passkey");
    setError(null);
    try {
      await signInWithPasskey();
    } catch (caught) {
      if (!wasCancelled(caught)) setError(passkeyError(caught));
      setBusy(null);
    }
  }

  return (
    <AuthLayout
      title="Where to next?"
      intro="Your trips, the places on the list, and the map they sit on."
      footer={
        <>
          No account yet?{" "}
          {/* Carries on where they were headed, whichever form they finish on. */}
          <Link to="/sign-up" state={location.state} className="text-ink underline underline-offset-4">
            Make one
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Email"
          type="email"
          /* "webauthn" is what lets the browser list passkeys here too. */
          autoComplete="username webauthn"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error?.fieldError("email")}
        />

        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error?.fieldError("password")}
        />

        {error && !error.fieldError("email") && !error.fieldError("password") ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error.fieldError("passkey") ?? error.message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" full disabled={busy !== null} className="mt-1">
          {busy === "password" ? "Signing in…" : "Sign in"}
        </Button>

        {passkeys ? (
          <>
            <div className="flex items-center gap-3 text-ink-3" aria-hidden="true">
              <span className="h-px flex-1 bg-rule" />
              <span className="stamp">or</span>
              <span className="h-px flex-1 bg-rule" />
            </div>

            <Button full disabled={busy !== null} onClick={usePasskey}>
              <PasskeyMark />
              {busy === "passkey" ? "Waiting for your passkey…" : "Sign in with a passkey"}
            </Button>
          </>
        ) : null}

        <Link
          to="/forgot-password"
          className="self-center text-[0.875rem] text-ink-2 underline underline-offset-4"
        >
          Forgotten your password?
        </Link>
      </form>
    </AuthLayout>
  );
}

function passkeyError(caught: unknown): ApiError {
  if (caught instanceof ApiError) {
    return caught.status === 422 ? new ApiError(422, PASSKEY_REFUSED) : caught;
  }
  return new ApiError(0, "Your device couldn't use a passkey just now. Try again, or use your password.");
}
