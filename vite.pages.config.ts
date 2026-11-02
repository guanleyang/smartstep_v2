import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "github-pages",
  base: "/smartstep_v2/",
  publicDir: "../public",
  define: {
    "import.meta.env.VITE_DISABLE_SERVICE_WORKER": JSON.stringify("true"),
  },
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});

