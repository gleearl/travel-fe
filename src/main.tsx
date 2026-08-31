import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/useAuth";
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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
