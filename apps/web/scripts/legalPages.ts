import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Plugin, loadEnv } from "vite";

/**
 * Legal Notice and Privacy (docs/cloud-setup.md, like Crucible): the name, address and contact
 * are not in the repository. The pages in `public/legal/` hold `%LEGAL_…%` tokens; this plugin
 * fills them in, in the dev server from `.env.local`, in the deploy from GitHub secrets.
 */
export const LEGAL_KEYS = ["LEGAL_NAME", "LEGAL_STREET", "LEGAL_CITY", "LEGAL_EMAIL"] as const;
export type LegalKey = (typeof LEGAL_KEYS)[number];

const MISSING = "[nicht konfiguriert]";

export function fillLegalTokens(
  html: string,
  values: Partial<Record<LegalKey, string>>,
): { html: string; missing: LegalKey[] } {
  const missing = LEGAL_KEYS.filter((key) => !values[key]?.trim());
  const filled = html.replace(/%(LEGAL_[A-Z]+)%/g, (token, key: string) => {
    if (!(LEGAL_KEYS as readonly string[]).includes(key)) return token;
    const value = values[key as LegalKey]?.trim() ?? "";
    return escapeHtml(value === "" ? MISSING : value);
  });
  return { html: filled, missing };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Fills the tokens: in the dev server when the page is served, in the build after Vite copied
 * it to `dist/legal/`. With `LEGAL_REQUIRED=true` (the Cloudflare deploy) a missing value breaks
 * the build; other builds warn and show "[nicht konfiguriert]".
 */
export function legalPages(): Plugin {
  let root = process.cwd();
  let base = "/";
  let outDir = path.resolve(root, "dist");
  let values: Partial<Record<LegalKey, string>> = {};

  return {
    name: "emberheir-legal-pages",

    configResolved(config) {
      root = config.root;
      base = config.base;
      outDir = path.resolve(root, config.build.outDir);
      const env = loadEnv(config.mode, root, "LEGAL_");
      values = Object.fromEntries(LEGAL_KEYS.map((key) => [key, process.env[key] ?? env[key]]));
    },

    configureServer(server) {
      const legalDir = path.resolve(root, "public", "legal");
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split("?")[0] ?? "";
        const prefix = `${base}legal/`;
        if (!pathname.startsWith(prefix) || !pathname.endsWith(".html")) {
          next();
          return;
        }
        const file = path.resolve(legalDir, pathname.slice(prefix.length));
        if (!file.startsWith(legalDir)) {
          next();
          return;
        }
        readFile(file, "utf8").then(
          (html) => {
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(fillLegalTokens(html, values).html);
          },
          () => next(),
        );
      });
    },

    async closeBundle() {
      const dir = path.join(outDir, "legal");
      const files = (await readdir(dir).catch(() => [] as string[])).filter((name) =>
        name.endsWith(".html"),
      );
      for (const name of files) {
        const file = path.join(dir, name);
        const { html, missing } = fillLegalTokens(await readFile(file, "utf8"), values);
        if (missing.length > 0) {
          const message = `Legal pages: ${missing.join(", ")} missing (legal/${name}).`;
          if (process.env.LEGAL_REQUIRED === "true") throw new Error(message);
          this.warn(message);
        }
        await writeFile(file, html);
      }
    },
  };
}
