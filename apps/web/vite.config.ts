import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@desktop": path.resolve(__dirname, "../desktop/src"),
      },
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL || ""),
    },
    server: {
      port: 5174,
      proxy: {
        "/auth": "http://localhost:3001",
        "/students": "http://localhost:3001",
        "/teachers": "http://localhost:3001",
        "/subjects": "http://localhost:3001",
        "/grades": "http://localhost:3001",
        "/users": "http://localhost:3001",
        "/health": "http://localhost:3001",
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
