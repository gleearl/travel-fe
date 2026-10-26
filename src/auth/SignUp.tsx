import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { ApiError } from "../lib/api/http";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";

export function SignUp() {
  const { user, signUp } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirmation: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  /* Back to where they were sent from — a shared trip they want to join,
     say — or the trips list when they came here on their own. */
  if (user) return <Navigate to={(location.state as { from?: string })?.from ?? "/"} replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(form);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, "Couldn't reach the server."));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Start a field guide"
      intro="One account, all your trips. Nothing here is shared with anyone."
      footer={
        <>
          Already have one?{" "}
          <Link to="/sign-in" state={location.state} className="text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Name"
          autoComplete="name"
          required
          value={form.name}
          onChange={set("name")}
          error={error?.fieldError("name")}
        />

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={form.email}
          onChange={set("email")}
          error={error?.fieldError("email")}
        />

        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set("password")}
          error={error?.fieldError("password")}
          hint="At least 12 characters. A sentence you'll remember beats a puzzle you won't."
        />

        <Field
          label="Password again"
          type="password"
          autoComplete="new-password"
          required
          value={form.passwordConfirmation}
          onChange={set("passwordConfirmation")}
        />

        {error && Object.keys(error.errors).length === 0 ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error.message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" full disabled={busy} className="mt-1">
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
