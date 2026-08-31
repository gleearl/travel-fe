import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { ForgotPassword } from "./auth/ForgotPassword";
import { RequireAuth } from "./auth/RequireAuth";
import { ResetPassword } from "./auth/ResetPassword";
import { SignIn } from "./auth/SignIn";
import { SignUp } from "./auth/SignUp";
import { TripsList } from "./trips/TripsList";

/* Split off on purpose: the map library is by far the heaviest thing this app
   depends on, and the trips list has no map on it. Signing in and looking at
   the list downloads none of it. */
const TripDetail = lazy(() =>
  import("./trip/TripDetail").then((module) => ({ default: module.TripDetail })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* The path the emailed reset link points at; see the API's
          AppServiceProvider, which builds that URL. */}
      <Route path="/reset-password" element={<ResetPassword />} />


      <Route
        path="/"
        element={
          <RequireAuth>
            <TripsList />
          </RequireAuth>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <RequireAuth>
            <Suspense fallback={<Unfolding />}>
              <TripDetail />
            </Suspense>
          </RequireAuth>
        }
      />

      {/* Anything else is a mistyped URL, not a 404 page worth designing. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* The same words the trip screen shows while it loads its own data, so the
   two waits read as one. */
function Unfolding() {
  return (
    <div className="relative z-10 grid min-h-dvh place-items-center text-ink-3" aria-busy="true">
      <span className="stamp">Unfolding the map</span>
    </div>
  );
}
