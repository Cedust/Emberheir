declare const __APP_VERSION__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;
/** Developer tools built in (src/devTools.ts, vite.config.ts). */
declare const __DEV_TOOLS__: boolean;

interface ImportMetaEnv {
  /** PR number of a PR preview build; unset for main and local builds. */
  readonly VITE_PREVIEW_PR?: string;
  /** Cloud saves (docs/cloud-setup.md); a build without them offers no sign-in. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}
