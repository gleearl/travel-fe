import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Custom domain: the app is served from the root, and the router repeats this as its basename via import.meta.env.BASE_URL.
  base: "/",
  /* Pinned, not just preferred: Laravel's FRONTEND_URL names this port for the
     CORS allow-list, so a dev server that quietly slid to the next free port
     would be shut out of the API it is talking to. */
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
