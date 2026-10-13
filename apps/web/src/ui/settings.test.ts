import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("stored settings", () => {
  it("never saved: the defaults", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps good values and repairs a broken one on its own", () => {
    const json = JSON.stringify({ theme: "banana", sound: false, screenShake: false });
    expect(parseSettings(json)).toEqual({
      ...DEFAULT_SETTINGS,
      sound: false,
      screenShake: false,
    });
  });

  it("drops settings that no longer exist and survives broken JSON", () => {
    const old = JSON.stringify({ ...DEFAULT_SETTINGS, theme: "dark", autoDrink: true });
    expect(parseSettings(old)).toEqual({ ...DEFAULT_SETTINGS, theme: "dark" });
    expect(parseSettings("{oops")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[1,2]")).toEqual(DEFAULT_SETTINGS);
  });
});
