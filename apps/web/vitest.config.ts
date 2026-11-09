import { defineProject } from "vitest/config";

export default defineProject({
  // The build's constants (vite.config.ts), fixed for the tests.
  define: {
    __APP_VERSION__: JSON.stringify("test"),
    __DEV_TOOLS__: "true",
    __BUILD_COMMIT__: JSON.stringify("test"),
    __BUILD_TIME__: JSON.stringify("2026-01-01T00:00:00.000Z"),
  },
  test: { name: "web", include: ["src/**/*.test.{ts,tsx}"] },
});
