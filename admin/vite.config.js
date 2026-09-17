import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  base: process.env.ADMIN_BASE || "/",
  plugins: [react()],
  resolve: {
    alias: { "@shared": path.join(root, "shared") },
  },
  server: { port: 5174, host: true },
});
