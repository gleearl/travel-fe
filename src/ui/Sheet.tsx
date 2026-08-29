import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/* A form, presented as a sheet.

   On a phone it fills the screen from the bottom; from `sm` up it becomes a
   card in the middle. One component either way — the difference is a media
   query, not a second implementation.

   Not a <dialog>: its modality is welcome, but its behaviour differs enough
   between browsers (and is missing entirely in jsdom) that the focus and
   escape handling would end up written here regardless.
*/
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Stays put above the keyboard while the body scrolls. */
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    /* The page behind must not scroll while a sheet is open — on a phone that
       reads as the sheet itself failing to scroll. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus lands inside the sheet, not left behind on the button that opened it.
    panel.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/35 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-sheet bg-paper shadow-sheet",
          "sm:max-w-lg sm:rounded-sheet",
          "motion-safe:animate-[rise_0.28s_var(--ease-settle)]",
        ].join(" ")}
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-card text-ink-2 hover:bg-accent-soft"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          /* Above the keyboard, and above the home indicator. */
          <footer className="border-t border-rule bg-paper px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
