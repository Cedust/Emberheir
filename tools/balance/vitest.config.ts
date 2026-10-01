import { defineProject } from "vitest/config";

export default defineProject({
  test: { name: "balance", include: ["src/**/*.test.ts"] },
});
