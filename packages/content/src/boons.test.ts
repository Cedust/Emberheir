import { describe, expect, it } from "vitest";
import { activeBoons, boonEffects, boonText, rollBoonOffer, Rng } from "@emberheir/sim";
import { BOON_FAMILIES, BOONS_CONTENT } from "./boons";
import { GAME_DATA } from "./game";

describe("Stolen Fire Boons", () => {
  it("8 Boons per family plus Fusions and the Blaze attribute Boons, unique ids, a number on every card that has one", () => {
    const families = new Set(BOON_FAMILIES.map((f) => f.id));
    expect(new Set(BOONS_CONTENT.map((b) => b.id)).size).toBe(BOONS_CONTENT.length);
    for (const f of families) {
      expect(
        BOONS_CONTENT.filter((b) => b.family === f && !b.fusion && !b.attributes),
        f,
      ).toHaveLength(8);
    }
    const fusions = BOONS_CONTENT.filter((b) => b.fusion);
    expect(fusions.length).toBeGreaterThanOrEqual(6);
    for (const b of BOONS_CONTENT) {
      expect(families.has(b.family), b.id).toBe(true);
      for (const f of b.fusion ?? []) expect(families.has(f), b.id).toBe(true);
      expect(b.text.includes("#"), b.id).toBe(b.value !== 0);
      expect(b.bonuses || b.rules || b.trigger || b.attributes, b.id).toBeTruthy();
      expect(boonText(b, 1)).not.toContain("#");
    }
  });

  it("every Warden act opens its family; Hearth is always open", () => {
    const tied = GAME_DATA.acts.flatMap((a) => (a.boonFamily ? [a.boonFamily] : []));
    expect(tied.sort()).toEqual(
      BOON_FAMILIES.map((f) => f.id)
        .filter((f) => f !== "hearth")
        .sort(),
    );
  });

  it("every Boon turns into a working effect at max rank and grade", () => {
    for (const b of BOONS_CONTENT) {
      const picks = [1, 2, 3].map(() => ({ id: b.id, grade: "blaze" as const }));
      const fx = boonEffects(activeBoons({ kept: picks, fresh: [] }, BOONS_CONTENT));
      expect(
        fx.triggers.length +
          Object.keys(fx.bonuses).length +
          Object.keys(fx.attributes).length +
          (fx.rules ? 1 : 0),
      ).toBeGreaterThan(0);
    }
  });

  it("an offer in run 1 has three Boons from Hearth and Ash only", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const offer = rollBoonOffer(
        BOONS_CONTENT,
        BOON_FAMILIES,
        { open: ["hearth", "ash"], active: [], damageType: "physical", reactionSlot: false },
        new Rng(seed),
      );
      expect(offer).toHaveLength(3);
      for (const p of offer) {
        const def = BOONS_CONTENT.find((b) => b.id === p.id);
        expect(["hearth", "ash"]).toContain(def?.family);
        expect(def?.slot).not.toBe("reaction");
      }
    }
  });
});
