import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();

  /* Nothing is decided until the stored token has been tried. Rendering the
     sign-in screen during that beat would flash it at everyone who reloads. */
  if (status === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center text-ink-3" aria-busy="true">
        <span className="stamp">Finding your trips</span>
      </div>
    );
  }

  if (!user) {
    /* Where they were headed, so signing in continues the journey rather than
       dropping them at the front door. */
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
