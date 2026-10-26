import { useEffect, useRef, useState } from "react";
import { getShareLink, setShareLink, shareUrl, turnOffShareLink, type ShareLink, type ShareRole } from "../lib/api/sharing";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";

const ROLES: { value: ShareRole; label: string; detail: string }[] = [
  { value: "viewer", label: "Can view", detail: "Joining puts them on the trip to read it." },
  { value: "editor", label: "Can edit", detail: "Joining lets them add and change places." },
];

/* The owner's share link. Anyone holding it can read the whole trip without an
   account; with one they can copy it, or join it with the role picked here. */
export function ShareSheet({ tripId, onClose }: { tripId: number; onClose: () => void }) {
  const [link, setLink] = useState<ShareLink | null | undefined>(undefined);
  const [role, setRole] = useState<ShareRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getShareLink(tripId)
      .then((found) => {
        setLink(found);
        if (found) setRole(found.role);
      })
      .catch(() => setError("Couldn't load the share link. Close this and try again."));
  }, [tripId]);

  async function save(next: ShareRole) {
    setRole(next);
    setBusy(true);
    setError(null);
    try {
      setLink(await setShareLink(tripId, next));
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      await turnOffShareLink(tripId);
      setLink(null);
      setConfirmingOff(false);
    } catch {
      setError("Couldn't turn the link off. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(shareUrl(link.token));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access: select it, so copying by hand is one keystroke.
      field.current?.select();
    }
  }

  return (
    <Sheet title="Share this trip" onClose={onClose} focusField={false}>
      <div className="flex flex-col gap-5">
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          Anyone with the link can see every place, note and tag on this trip, without an account. With
          one, they can copy the trip to their own account, or join it.
        </p>

        <fieldset className="flex flex-col gap-2" disabled={busy || link === undefined}>
          <legend className="stamp mb-1.5 text-ink-2">People who join</legend>
          {ROLES.map((option) => (
            <label
              key={option.value}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-card border px-3.5 py-3",
                role === option.value ? "border-active bg-surface ring-1 ring-active" : "border-rule bg-surface",
              ].join(" ")}
            >
              <input
                type="radio"
                name="share-role"
                value={option.value}
                checked={role === option.value}
                onChange={() => (link ? void save(option.value) : setRole(option.value))}
                className="mt-1 accent-[var(--color-active)]"
              />
              <span>
                <span className="block text-[0.9375rem] text-ink">{option.label}</span>
                <span className="block text-[0.8125rem] text-ink-3">{option.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {link === undefined && !error ? (
          <p className="stamp text-ink-3" aria-busy="true">
            Loading
          </p>
        ) : link === null ? (
          <Button variant="primary" full disabled={busy} onClick={() => save(role)}>
            {busy ? "Making the link…" : "Create link"}
          </Button>
        ) : link ? (
          <div className="flex flex-col gap-3">
            <label htmlFor="share-url" className="stamp text-ink-2">
              Link
            </label>
            <div className="flex gap-2">
              <input
                id="share-url"
                ref={field}
                readOnly
                value={shareUrl(link.token)}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-card border border-rule bg-sunk/60 px-3 py-2.5 text-[0.875rem] text-ink"
              />
              <Button variant="primary" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <span aria-live="polite" className="sr-only">
              {copied ? "Link copied" : ""}
            </span>

            {confirmingOff ? (
              <div className="flex flex-col gap-2 rounded-card bg-sunk/70 px-3 py-2.5">
                <p className="text-[0.875rem] text-ink-2">
                  The link stops working for everyone who has it. People who already joined stay on the
                  trip. Sharing again makes a new link.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setConfirmingOff(false)} disabled={busy}>
                    Keep it
                  </Button>
                  <Button size="sm" variant="danger" className="border border-danger/35" onClick={turnOff} disabled={busy}>
                    {busy ? "Turning off…" : "Turn off link"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" className="self-start" onClick={() => setConfirmingOff(true)}>
                Turn off link
              </Button>
            )}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-[0.875rem] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
