import type { CloudConfig } from "./config";
import { loadFirebase } from "./firebase";

/**
 * The cloud save of one account: one Firestore document `saves/{uid}` (firebase/firestore.rules).
 * `payload` is the sealed backup of every Heir (saves.ts `backupOf`), `revision` starts at 1 and
 * goes up by one with every write.
 */
export interface CloudSnapshot {
  payload: string;
  revision: number;
  saveVersion: number;
}

export interface CloudWrite extends CloudSnapshot {
  clientVersion: string;
}

/**
 * - `offline`: no connection or the daily limit is reached; a later try can work.
 * - `denied`: the rules said no (another device wrote a newer revision, or the write is wrong).
 */
export type CloudErrorCode = "offline" | "denied";

export class CloudError extends Error {
  constructor(readonly code: CloudErrorCode) {
    super(`Cloud save failed: ${code}`);
    this.name = "CloudError";
  }
}

/** The cloud storage; tests put a stand-in in its place. */
export interface CloudRemote {
  read: (uid: string) => Promise<CloudSnapshot | null>;
  /** Writes exactly this revision; the rules want the one after the stored one. */
  write: (uid: string, save: CloudWrite) => Promise<void>;
  erase: (uid: string) => Promise<void>;
}

function toCloudError(error: unknown): CloudError {
  if (error instanceof CloudError) return error;
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return new CloudError(code === "permission-denied" ? "denied" : "offline");
}

/** The cloud storage through Firestore Lite; the SDK loads on the first call. */
export function firestoreRemote(config: CloudConfig): CloudRemote {
  const firestore = async () =>
    Promise.all([loadFirebase(config), import("firebase/firestore/lite")] as const).then(
      ([services, module]) => ({ db: services.db, module }),
    );

  return {
    read: async (uid) => {
      try {
        const { db, module } = await firestore();
        const snapshot = await module.getDoc(module.doc(db, "saves", uid));
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        return {
          payload: String(data.payload),
          revision: Number(data.revision),
          saveVersion: Number(data.saveVersion),
        };
      } catch (error) {
        throw toCloudError(error);
      }
    },

    write: async (uid, save) => {
      try {
        const { db, module } = await firestore();
        await module.setDoc(module.doc(db, "saves", uid), {
          ...save,
          updatedAt: module.serverTimestamp(),
        });
      } catch (error) {
        throw toCloudError(error);
      }
    },

    erase: async (uid) => {
      try {
        const { db, module } = await firestore();
        await module.deleteDoc(module.doc(db, "saves", uid));
      } catch (error) {
        throw toCloudError(error);
      }
    },
  };
}
