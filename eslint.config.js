import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/playwright-report/**", "**/test-results/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.es2023 } },
  },
  {
    // The simulation must stay free of browser and React dependencies.
    files: ["packages/sim/src/**/*.ts", "packages/content/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react-*", "react/*", "pixi.js", "@emberheir/web"] },
      ],
      "no-restricted-globals": ["error", "window", "document", "localStorage"],
      // Determinism: all randomness goes through the seeded RNG, no wall-clock time.
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the seeded Rng from @emberheir/sim." },
        {
          object: "Date",
          property: "now",
          message: "The simulation must not read wall-clock time.",
        },
      ],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["tools/**/*.ts", "**/*.config.{ts,js}", "apps/web/e2e/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
);
