import { Link } from "react-router";
import { useAuth } from "../auth/useAuth";
import { Mark } from "./Mark";

/* The one bar every signed-in screen carries. Deliberately thin: on a phone
   the map screen needs its height back, and there is nowhere else to go. */
export function AppHeader({ back }: { back?: { to: string; label: string } }) {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-rule bg-paper/90 px-4 py-2.5 backdrop-blur-sm">
      {back ? (
        <Link
          to={back.to}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-card px-2 text-ink-2 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="stamp">{back.label}</span>
        </Link>
      ) : (
        <Link to="/" className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-card px-1 text-ink">
          <Mark size={26} />
          <span className="stamp pt-0.5">Field Guide</span>
        </Link>
      )}

      <div className="flex items-center gap-1">
        <span className="hidden text-[0.8125rem] text-ink-3 sm:inline">{user?.name}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="stamp min-h-11 rounded-card px-2.5 text-ink-2 hover:bg-accent-soft hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
