import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

// Resolve workspace packages to their source (no need to build first)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@peps/avatar-engine": resolve(__dirname, "../avatar-engine/src/index.ts"),
      "@peps/avatar-sdk": resolve(__dirname, "../avatar-sdk/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
})
