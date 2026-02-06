import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "convex/**/*.test.ts", "lib/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    passWithNoTests: false,
    bail: 1,
    dangerouslyIgnoreUnhandledErrors: false,
  },
});
