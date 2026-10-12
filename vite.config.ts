import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: "/hsc-practice-hub/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.endsWith("/src/data/past-paper-questions.json") ||
            id.endsWith("/src/data/past-papers.json")
          )
            return "past-paper-data";
        },
      },
    },
  },
});
