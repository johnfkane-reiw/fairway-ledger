import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // `vite dev` proxies /api to a local wrangler instance if you run one on 8788.
  server: { proxy: { "/api": "http://localhost:8788" } },
});
