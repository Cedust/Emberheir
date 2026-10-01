declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  /** PR number of a PR preview build; unset for main and local builds. */
  readonly VITE_PREVIEW_PR?: string;
}
