import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore/lite";
import type { CloudConfig } from "./config";

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: Promise<FirebaseServices> | null = null;

/**
 * Loads the Firebase SDK only when a player uses the cloud: without a sign-in it never loads.
 * The first call starts it, every later one shares the same result.
 */
export function loadFirebase(config: CloudConfig): Promise<FirebaseServices> {
  services ??= (async () => {
    const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore/lite"),
    ]);
    const app = initializeApp(config.options);
    return { app, auth: getAuth(app), db: getFirestore(app) };
  })();
  return services;
}
