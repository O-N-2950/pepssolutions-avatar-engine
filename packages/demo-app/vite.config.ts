import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@peps/avatar-engine":       resolve(__dirname, "../avatar-engine/src/index.ts"),
      "@peps/avatar-sdk":          resolve(__dirname, "../avatar-sdk/src/index.ts"),
      "@peps/voice-avatar-bridge": resolve(__dirname, "../voice-avatar-bridge/src/index.ts"),
    },
  },
  server: { port: 5173, host: true },
  build: { outDir: "dist", sourcemap: false, target: "es2020" },
})
