import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build:
    mode === "library"
      ? {
          outDir: "dist",
          copyPublicDir: false,
          lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
          rollupOptions: {
            output: { banner: '"use client";' },
            external: (id) => /^(react|react-dom|es-hangul)(\/|$)/.test(id),
          },
        }
      : { outDir: "demo-dist" },
}));
