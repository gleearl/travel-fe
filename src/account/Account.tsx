import { useEffect, useState } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api/http";
import { addPasskey, alreadyRegistered, listPasskeys, removePasskey, wasCancelled } from "../lib/api/passkeys";
import type { Passkey } from "../lib/api/types";
import { deviceName, formatDay } from "../lib/format";
import { AppHeader } from "../ui/AppHeader";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { PasskeyMark } from "../ui/PasskeyMark";

/* Who you are here, and the ways you can get back in. For now that is the
   passkeys: the password is changed through the reset email, as before. */
export function Account() {
  const { user } = useAuth();
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listPasskeys()
      .then(setPasskeys)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="relative z-10 min-h-dvh">
      <AppHeader back={{ to: "/", label: "Trips" }} />

      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight text-ink">{user?.name}</h1>
          <p className="mt-1 text-[0.9375rem] text-ink-2">{user?.email}</p>
        </div>

        <section aria-labelledby="passkeys-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="passkeys-heading" className="font-display text-xl text-ink">
              Passkeys
            </h2>
            <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-ink-2">
              Sign in with your fingerprint, face or device PIN instead of typing your password. Your
              password keeps working too.
            </p>
          </div>

          {failed ? (
            <p role="alert" className="text-[0.9375rem] text-danger">
              Couldn't load your passkeys. Reload the page to try again.
            </p>
          ) : passkeys === null ? (
            <p className="stamp text-ink-3" aria-busy="true">
              Loading
            </p>
          ) : (
            <>
              {passkeys.length > 0 ? (
                <ul className="flex flex-col divide-y divide-rule rounded-card border border-rule bg-surface">
                  {passkeys.map((passkey) => (
                    <PasskeyRow
                      key={passkey.id}
                      passkey={passkey}
                      onRemoved={() => setPasskeys((list) => list?.filter((p) => p.id !== passkey.id) ?? null)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-card border border-dashed border-rule-strong px-4 py-5 text-[0.9375rem] text-ink-2">
                  No passkeys yet. Add one for this device and you can sign in without your password next time.
                </p>
              )}

              <AddPasskey onAdded={(passkey) => setPasskeys((list) => [passkey, ...(list ?? [])])} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function PasskeyRow({ passkey, onRemoved }: { passkey: Passkey; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await removePasskey(passkey.id);
      onRemoved();
    } catch {
      setError("Couldn't remove it. Try again.");
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sunk text-ink-2">
          <PasskeyMark />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] text-ink">{passkey.name}</p>
          <p className="text-[0.8125rem] text-ink-3">
            Added {formatDay(passkey.createdAt)} ·{" "}
            {passkey.lastUsedAt ? `Last used ${formatDay(passkey.lastUsedAt)}` : "Never used"}
          </p>
        </div>
        {!confirming ? (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Remove ${passkey.name}`}>
            Remove
          </Button>
        ) : null}
      </div>

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-card bg-sunk/70 px-3 py-2.5 sm:flex-row sm:items-center">
          <p className="flex-1 text-[0.875rem] text-ink-2">
            You won't be able to sign in with {passkey.name} any more. Also delete it from the device's
            password manager.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              Keep
            </Button>
            <Button size="sm" variant="danger" className="border border-danger/35" onClick={remove} disabled={busy}>
              {busy ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function AddPasskey({ onAdded }: { onAdded: (passkey: Passkey) => void }) {
  const [supported] = useState(() => browserSupportsWebAuthn());
  const [name, setName] = useState(() => deviceName(navigator.userAgent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supported) {
    return (
      <p className="text-[0.875rem] text-ink-3">
        This browser can't make passkeys. Try a recent Safari, Chrome, Edge or Firefox.
      </p>
    );
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onAdded(await addPasskey(name.trim() || deviceName(navigator.userAgent)));
    } catch (caught) {
      if (alreadyRegistered(caught)) setError("This device already has a passkey for your account.");
      else if (caught instanceof ApiError) setError(caught.fieldError("passkey") ?? caught.message);
      else if (!wasCancelled(caught)) setError("Your device couldn't make a passkey just now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Name this passkey"
          className="flex-1"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="So you can tell your devices apart later."
        />
        <Button type="submit" variant="primary" disabled={busy} className="sm:mb-[1.6rem]">
          <PasskeyMark />
          {busy ? "Waiting for your device…" : "Add a passkey"}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-[0.875rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
