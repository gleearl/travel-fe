import { Navigate, Route, Routes } from "react-router";
import { ForgotPassword } from "./auth/ForgotPassword";
import { RequireAuth } from "./auth/RequireAuth";
import { ResetPassword } from "./auth/ResetPassword";
import { SignIn } from "./auth/SignIn";
import { SignUp } from "./auth/SignUp";
import { TripDetail } from "./trip/TripDetail";
import { TripsList } from "./trips/TripsList";

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
            <TripDetail />
          </RequireAuth>
        }
      />

      {/* Anything else is a mistyped URL, not a 404 page worth designing. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
