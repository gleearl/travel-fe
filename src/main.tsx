import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/useAuth";
import { AppRoutes } from "./routes";
import "./styles/index.css";

/* GitHub Pages serves this app from /travel-fe/, so every route is under that
   prefix. BASE_URL is what vite.config.ts set, which keeps the sub-path
   written down in exactly one place. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
