import type { AuthProvider, User } from "firebase/auth";
import type { CloudConfig } from "./config";
import { loadFirebase } from "./firebase";

/** The sign-in providers (like Crucible: Google and GitHub, no Microsoft or Apple). */
export const PROVIDERS = ["google", "github"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Readonly<Record<Provider, string>> = {
  google: "Google",
  github: "GitHub",
};

export interface CloudUser {
  uid: string;
  name: string | null;
  provider: Provider | null;
}

/**
 * What can go wrong when signing in:
 * - `cancelled`: the player closed the window; the game says nothing.
 * - `popup-blocked`: the browser held the sign-in window back.
 * - `other-provider`: the same e-mail already signed in with the other provider.
 * - `recent-login`: deleting the account needs a fresh sign-in.
 * - `offline`: no connection.
 * - `failed`: anything else.
 */
export type AuthErrorCode =
  "cancelled" | "popup-blocked" | "other-provider" | "recent-login" | "offline" | "failed";

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(`Sign-in failed: ${code}`);
    this.name = "AuthError";
  }
}

const ERROR_CODES: Readonly<Record<string, AuthErrorCode>> = {
  "auth/popup-closed-by-user": "cancelled",
  "auth/cancelled-popup-request": "cancelled",
  "auth/user-cancelled": "cancelled",
  "auth/popup-blocked": "popup-blocked",
  "auth/account-exists-with-different-credential": "other-provider",
  "auth/requires-recent-login": "recent-login",
  "auth/network-request-failed": "offline",
};

export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return new AuthError(ERROR_CODES[code] ?? "failed");
}

/** The sign-in errors in the game's words (`cancelled` says nothing). */
export const AUTH_ERROR_TEXT: Readonly<Record<AuthErrorCode, string>> = {
  cancelled: "",
  "popup-blocked": "Your browser held the sign-in window back. Allow pop-ups here and try again.",
  "other-provider": "This e-mail first signed in with the other provider. Use that one.",
  "recent-login": "Sign in once more to confirm it is you.",
  offline: "The cloud cannot be reached. Check your connection and try again.",
  failed: "That did not work. Try again.",
};

/** The sign-in; tests put a stand-in in its place. */
export interface AuthGateway {
  /** The signed-in user once Firebase restored it (`null`: signed out on this device). */
  restore: () => Promise<CloudUser | null>;
  signIn: (provider: Provider) => Promise<CloudUser>;
  signOut: () => Promise<void>;
  /** Deletes the account; asks for a fresh sign-in first when Firebase wants one. */
  deleteUser: () => Promise<void>;
}

const PROVIDER_IDS: Readonly<Record<string, Provider>> = {
  "google.com": "google",
  "github.com": "github",
};

function toCloudUser(user: User): CloudUser {
  const id = user.providerData[0]?.providerId;
  return {
    uid: user.uid,
    name: user.displayName ?? user.email,
    provider: id === undefined ? null : (PROVIDER_IDS[id] ?? null),
  };
}

/** The sign-in through Firebase Auth, with a pop-up window (the game's own site is not the auth domain). */
export function firebaseAuth(config: CloudConfig): AuthGateway {
  const auth = async () =>
    Promise.all([loadFirebase(config), import("firebase/auth")] as const).then(
      ([services, module]) => ({ auth: services.auth, module }),
    );

  const providerFor = async (provider: Provider): Promise<AuthProvider> => {
    const { module } = await auth();
    return provider === "google"
      ? new module.GoogleAuthProvider()
      : new module.GithubAuthProvider();
  };

  return {
    restore: async () => {
      const { auth: a } = await auth();
      await a.authStateReady();
      return a.currentUser ? toCloudUser(a.currentUser) : null;
    },

    signIn: async (provider) => {
      try {
        const { auth: a, module } = await auth();
        const credential = await module.signInWithPopup(a, await providerFor(provider));
        return toCloudUser(credential.user);
      } catch (error) {
        throw toAuthError(error);
      }
    },

    signOut: async () => {
      const { auth: a, module } = await auth();
      await module.signOut(a);
    },

    deleteUser: async () => {
      const { auth: a, module } = await auth();
      const user = a.currentUser;
      if (!user) return;
      try {
        await module.deleteUser(user);
      } catch (error) {
        if (toAuthError(error).code !== "recent-login") throw toAuthError(error);
        try {
          await module.reauthenticateWithPopup(
            user,
            await providerFor(toCloudUser(user).provider ?? "google"),
          );
          await module.deleteUser(user);
        } catch (retry) {
          throw toAuthError(retry);
        }
      }
    },
  };
}
