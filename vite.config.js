import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cloudflare Pages exposes the deployed commit SHA at build time.
const sha = (process.env.CF_PAGES_COMMIT_SHA || "dev").slice(0, 7);
const builtAt = new Date().toISOString().slice(0, 16).replace("T", " ");

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(sha),
    __BUILD_TIME__: JSON.stringify(builtAt),
  },
  // `vite dev` proxies /api to a local wrangler instance if you run one on 8788.
  server: { proxy: { "/api": "http://localhost:8788" } },
});
