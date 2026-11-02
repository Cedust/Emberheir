import type { FirebaseOptions } from "firebase/app";

/**
 * The Firebase setup of this build (docs/cloud-setup.md), from the `VITE_FIREBASE_*` variables.
 * The API key is public; the Security Rules (firebase/firestore.rules) are the protection.
 * `null`: this build has no cloud, and the game offers no sign-in (local builds, GitHub Pages).
 */
export interface CloudConfig {
  options: FirebaseOptions;
}

export function readCloudConfig(env: ImportMetaEnv = import.meta.env): CloudConfig | null {
  const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID } = env;
  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_AUTH_DOMAIN || !VITE_FIREBASE_PROJECT_ID) {
    return null;
  }
  return {
    options: {
      apiKey: VITE_FIREBASE_API_KEY,
      authDomain: VITE_FIREBASE_AUTH_DOMAIN,
      projectId: VITE_FIREBASE_PROJECT_ID,
      ...(env.VITE_FIREBASE_APP_ID ? { appId: env.VITE_FIREBASE_APP_ID } : {}),
    },
  };
}

/** The build's cloud, read once. */
export const CLOUD: CloudConfig | null = readCloudConfig();
