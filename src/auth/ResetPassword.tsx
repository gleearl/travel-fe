import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { resetPassword } from "../lib/api/auth";
import { ApiError } from "../lib/api/http";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { AuthLayout } from "./AuthLayout";

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  /* Both come from the emailed link. The email is in the URL rather than
     typed again so that a reset can't be pointed at a different account. */
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetPassword({ token, email, password, passwordConfirmation });
      /* Straight to sign-in: the reset revoked every token this account had,
         including any this browser was holding. */
      navigate("/sign-in", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(false);
    }
  }

  if (!token || !email) {
    return (
      <AuthLayout
        title="That link is incomplete"
        intro="Reset links expire, and some mail apps clip them. Ask for a fresh one and use it straight away."
        footer={
          <Link to="/forgot-password" className="text-ink underline underline-offset-4">
            Send another link
          </Link>
        }
      >
        <span />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" intro={`For ${email}.`}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error?.fieldError("password")}
          hint="At least 12 characters."
        />

        <Field
          label="New password again"
          type="password"
          autoComplete="new-password"
          required
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
        />

        {error?.fieldError("email") ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error.fieldError("email")}
          </p>
        ) : null}

        <Button type="submit" variant="primary" full disabled={busy}>
          {busy ? "Saving…" : "Save and sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
