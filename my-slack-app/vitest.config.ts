import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    globalSetup: ["./tests/e2e/global.setup.ts"],
    setupFiles: ["./tests/e2e/env-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    // E2E tests must run sequentially to avoid DB conflicts
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
