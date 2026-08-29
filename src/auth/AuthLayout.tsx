import type { ReactNode } from "react";
import { Mark } from "../ui/Mark";

/* The frame every sign-in screen shares: the mark, the name, a ruled line,
   and the form under it. Centred on paper, one column at every width — these
   screens are three fields long and have nothing to fill a second one with. */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="motion-safe:rise">
        <div className="flex items-center gap-2.5 text-ink">
          <Mark />
          <span className="stamp pt-0.5">Field Guide</span>
        </div>

        <h1 className="mt-7 font-display text-[2rem] leading-[1.15] text-ink">{title}</h1>
        {intro ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{intro}</p> : null}

        <hr className="mt-6 mb-7 border-rule" />

        {children}
      </div>

      {footer ? <div className="mt-8 text-[0.875rem] text-ink-2">{footer}</div> : null}
    </main>
  );
}
