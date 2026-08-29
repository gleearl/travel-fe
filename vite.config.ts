import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* Project Pages serve this app from /travel-fe/, not from the root. The
     value is repeated by the router as its basename via import.meta.env.BASE_URL,
     so this line is the only place the sub-path is written down. */
  base: "/travel-fe/",
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
