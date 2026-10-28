import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";

/**
 * Sealed save games (Release 1.0, Timo 2026-10-28: "kein Klartext, weder im Browser noch im
 * Export"). A save is packed (deflate), then sealed with XChaCha20-Poly1305: unreadable, and a
 * single changed character makes it fail to open, so a hand-edited save does not load.
 *
 * The key ships with the game, so this keeps out casual editing, not a determined cheater; that
 * is enough for a single-player game. Everything is synchronous, like `localStorage`.
 */
const PREFIX = "EH1.";
const NONCE_BYTES = 24;

// 32 bytes. Changing it makes every sealed save unreadable: never change it.
const KEY = Uint8Array.from(
  "8f3c1a7e52d94b0e6a1f7c2d9e4b8a3051c6f2e7d8a94b1c0e5f3a7d2c9b6e48".match(/../g) ?? [],
  (h) => parseInt(h, 16),
);

export class SaveSealError extends Error {}

/** Whether a stored text is sealed (anything else is a plain save from before 1.0). */
export const isSealed = (text: string): boolean => text.startsWith(PREFIX);

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Packs and seals a text (a save game's JSON). */
export function seal(text: string): string {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const sealed = xchacha20poly1305(KEY, nonce).encrypt(deflateSync(strToU8(text)));
  const out = new Uint8Array(NONCE_BYTES + sealed.length);
  out.set(nonce);
  out.set(sealed, NONCE_BYTES);
  return PREFIX + toBase64(out);
}

/** Opens a sealed text. Throws `SaveSealError` if it is not sealed, broken or was changed. */
export function unseal(text: string): string {
  if (!isSealed(text)) throw new SaveSealError("Not a sealed save");
  try {
    const bytes = fromBase64(text.slice(PREFIX.length));
    const nonce = bytes.subarray(0, NONCE_BYTES);
    const packed = xchacha20poly1305(KEY, nonce).decrypt(bytes.subarray(NONCE_BYTES));
    return strFromU8(inflateSync(packed));
  } catch {
    throw new SaveSealError("This save is damaged");
  }
}
