import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { ApiError } from "../lib/api/http";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";

export function SignIn() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in — usually a back button landing here.
  if (user) return <Navigate to={(location.state as { from?: string })?.from ?? "/"} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Where to next?"
      intro="Your trips, the places on the list, and the map they sit on."
      footer={
        <>
          No account yet?{" "}
          <Link to="/sign-up" className="text-ink underline underline-offset-4">
            Make one
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
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
            {error.message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" full disabled={busy} className="mt-1">
          {busy ? "Signing in…" : "Sign in"}
        </Button>

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
