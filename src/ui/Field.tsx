import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const BOX =
  "w-full rounded-card border bg-surface px-3 py-2.5 text-[0.9375rem] text-ink " +
  "placeholder:text-ink-3/70 transition-colors focus:border-focus focus:outline-none " +
  "focus-visible:outline-none";

interface Common {
  label: string;
  /** The server's word for what is wrong with this field, if anything is. */
  error?: string;
  hint?: string;
}

export function Field({
  label,
  error,
  hint,
  className = "",
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="stamp mb-1.5 block text-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`${BOX} ${error ? "border-danger" : "border-rule"}`}
        {...rest}
      />
      <Note id={`${id}-note`} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({
  label,
  error,
  hint,
  className = "",
  rows = 4,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="stamp mb-1.5 block text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`${BOX} resize-y leading-relaxed ${error ? "border-danger" : "border-rule"}`}
        {...rest}
      />
      <Note id={`${id}-note`} error={error} hint={hint} />
    </div>
  );
}

function Note({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null;

  return (
    <p id={id} className={`mt-1.5 text-[0.8125rem] ${error ? "text-danger" : "text-ink-3"}`}>
      {error ?? hint}
    </p>
  );
}
