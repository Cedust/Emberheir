import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function gitCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

// GitHub Pages serves the site under /<repo>/, set via BASE_PATH in the deploy workflow.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  build: {
    // The PixiJS views load on demand (src/game/lazyViews.tsx); PixiJS gets a chunk of its own.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Vite's preload helper is used by the first page too: it must not ride with PixiJS.
            { name: "preload", test: /preload-helper/, priority: 2 },
            { name: "pixi", test: /node_modules[\\/](pixi\.js|@pixi)[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  define: {
    __BUILD_COMMIT__: JSON.stringify(gitCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
