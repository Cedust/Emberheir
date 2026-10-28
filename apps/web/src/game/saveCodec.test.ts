import { describe, expect, it } from "vitest";
import { SaveSealError, isSealed, seal, unseal } from "./saveCodec";

describe("sealed saves", () => {
  const json = JSON.stringify({ hero: { level: 42 }, wallet: { acorns: 1234 } });

  it("seal into unreadable, packed text and open again", () => {
    const sealed = seal(json);
    expect(isSealed(sealed)).toBe(true);
    expect(sealed).not.toContain("acorns");
    expect(sealed).not.toContain("1234");
    expect(unseal(sealed)).toBe(json);
    // A fresh nonce every time: the same save never looks the same twice.
    expect(seal(json)).not.toBe(sealed);
  });

  it("pack a long save smaller than its JSON", () => {
    const big = JSON.stringify({
      items: Array.from({ length: 400 }, (_, i) => ({ id: i, affix: "fire-damage" })),
    });
    expect(seal(big).length).toBeLessThan(big.length / 3);
  });

  it("refuse a save with a single character changed, and plain text", () => {
    const sealed = seal(json);
    const i = sealed.length - 10;
    const changed = sealed.slice(0, i) + (sealed[i] === "A" ? "B" : "A") + sealed.slice(i + 1);
    expect(() => unseal(changed)).toThrow(SaveSealError);
    expect(() => unseal(json)).toThrow(SaveSealError);
  });
});
