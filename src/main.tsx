import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/useAuth";
import { LiveUpdatesProvider } from "./live/useLiveUpdates";
import { AppRoutes } from "./routes";
import "./styles/index.css";

/* The custom domain serves this app from the root, so BASE_URL is "/" and the
   basename is a no-op today. It stays wired up anyway: BASE_URL is whatever
   vite.config.ts set, which is what keeps a base path — should the app ever
   sit under one again, as it did on Project Pages — written down once. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        {/* Inside AuthProvider because it polls only while signed in, and
            around everything because one poller for the app is the point. */}
        <LiveUpdatesProvider>
          <AppRoutes />
        </LiveUpdatesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
