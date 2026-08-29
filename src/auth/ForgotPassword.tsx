import { useState } from "react";
import { Link } from "react-router";
import { forgotPassword } from "../lib/api/auth";
import { ApiError } from "../lib/api/http";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { AuthLayout } from "./AuthLayout";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      /* The server answers the same way whether or not that email has an
         account, so this message is deliberately vague — it is not a lookup
         anyone can use to find out who is registered here. */
      setSent(await forgotPassword(email));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Forgotten password"
      intro="Tell us the email on the account and we'll send a link to set a new password."
      footer={
        <Link to="/sign-in" className="text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="rounded-card border border-rule bg-surface px-4 py-3.5 text-[0.9375rem] leading-relaxed text-ink-2">
          {sent}
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error ?? undefined}
          />

          <Button type="submit" variant="primary" full disabled={busy}>
            {busy ? "Sending…" : "Send the link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
