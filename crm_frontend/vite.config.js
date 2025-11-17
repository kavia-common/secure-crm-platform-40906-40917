import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PUBLIC_INTERFACE
/**
 * Vite configuration for CRM Frontend.
 * - Serves dev and preview on port 3000, bound to all hosts.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  },
  preview: {
    host: true,
    port: 3000
  }
});
