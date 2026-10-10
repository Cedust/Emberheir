import { describe, expect, it } from "vitest";
import { type Cheat, applyCheat } from "./cheats";
import { PROGRESSION } from "./constants";
import { type GameState, applyAction, masteryPointsLeft, newGame, openBranches } from "./game";
import { TEST_GAME_DATA as data } from "./test-fixtures";

const start = () => newGame(data, { seed: 7, classId: "test-fighter" });
const cheat = (state: GameState, ...cheats: Cheat[]) =>
  cheats.reduce((s, c) => applyCheat(s, data, c), state);

describe("Cheat Mode", () => {
  it("raises the level with its points and the Weapon Rank (capped by the run)", () => {
    const s = cheat(start(), { kind: "level", level: 20 });
    expect(s.hero.level).toBe(20);
    expect(s.hero.unspentAttributePoints).toBe(start().hero.unspentAttributePoints);
    // Skill Points come from Waymarks, not levels.
    expect(s.hero.unspentSkillPoints).toBe(PROGRESSION.startSkillPoints);
    expect(masteryPointsLeft(s, data)).toBe(4);
    const later = { ...s, legacy: { ...s.legacy, prestige: 2 } };
    expect(masteryPointsLeft(later, data)).toBe(7);
  });

  it("sets Skill Points, and clearing acts pays their Waymarks", () => {
    let s = cheat(start(), { kind: "skillPoints", amount: 9 });
    expect(s.hero.unspentSkillPoints).toBe(9);
    s = cheat(s, { kind: "clearAct" });
    expect(s.progress.waymarks).toHaveLength(3);
    expect(s.hero.unspentSkillPoints).toBe(12);
  });

  it("lowers the level; attributes and Skill Points (from Waymarks) stay", () => {
    let s = cheat(start(), { kind: "level", level: 10 });
    s = applyAction(s, data, { type: "allocateAttributes", points: { strength: 4 } });
    s = cheat(s, { kind: "level", level: 3 });
    expect(s.hero.level).toBe(3);
    expect(s.hero.attributes.strength).toBe(start().hero.attributes.strength + 4);
    expect(s.hero.unspentSkillPoints).toBe(PROGRESSION.startSkillPoints);
  });

  it("sets the unspent Attribute Points", () => {
    const s = cheat(start(), { kind: "attributePoints", amount: 9 });
    expect(s.hero.unspentAttributePoints).toBe(9);
  });

  it("adds Mastery points on top of the Weapon Rank, and a respec keeps them", () => {
    let s = cheat(start(), { kind: "masteryPoints", amount: 5 }, { kind: "unlockCamp" });
    expect(masteryPointsLeft(s, data)).toBe(5);
    s = applyAction(s, data, { type: "learnMastery", nodeId: "refine" });
    expect(masteryPointsLeft(s, data)).toBe(4);
    s = cheat(s, { kind: "currency", currency: "gold", amount: 500 });
    s = applyAction(s, data, { type: "respecMastery" });
    expect(masteryPointsLeft(s, data)).toBe(5);
  });

  it("sets currencies, Essences, Runes and flasks", () => {
    const s = cheat(
      start(),
      { kind: "currency", currency: "harvesterEmber", amount: 3 },
      { kind: "essence", essenceId: "ash", amount: 9 },
      { kind: "rune", runeId: "el", amount: 2 },
      { kind: "flasks", amount: 5 },
    );
    expect(s.wallet.harvesterEmber).toBe(3);
    expect(s.wallet.essences.ash).toBe(9);
    expect(s.wallet.runes.el).toBe(2);
    expect(s.legacy.runesFound).toContain("el");
    expect(s.flaskCharges).toBe(5);
  });

  it("gives items and Uniques, and rerolls them in place", () => {
    let s = cheat(
      start(),
      { kind: "giveItem", baseId: "test-ring", rarity: "rare", itemLevel: 30 },
      { kind: "giveItem", baseId: "", rarity: "legendary", itemLevel: 5, uniqueId: "boss-trophy" },
    );
    expect(s.inventory.map((p) => p.item.rarity)).toEqual(["rare", "legendary"]);
    expect(s.inventory[1]?.item.uniqueId).toBe("boss-trophy");
    const ring = s.inventory[0];
    if (!ring) throw new Error("no ring");
    s = cheat(s, { kind: "rerollItem", itemId: ring.item.id, rarity: "magic", itemLevel: 50 });
    expect(s.inventory[0]).toMatchObject({ x: ring.x, y: ring.y });
    expect(s.inventory[0]?.item).toMatchObject({
      id: ring.item.id,
      rarity: "magic",
      itemLevel: 50,
    });
  });

  it("clears the next act and starts the Prestige flow at the newest one", () => {
    let s = cheat(start(), { kind: "clearAct" });
    // Run 1 has one act, so its fall is the Harvest.
    expect(s.pendingPrestige?.actId).toBe("test-act");
    expect(s.legacy.echoes["test-echo"]?.stage).toBe(1);
    const branch = openBranches(s, data)[0];
    s = applyAction(s, data, { type: "prestige", ...(branch ? { branchId: branch.id } : {}) });
    expect(s.legacy.prestige).toBe(1);
    s = cheat(s, { kind: "clearAct", all: true });
    expect(s.progress.actsCleared).toContain("test-act");
    expect(s.pendingPrestige).not.toBeNull();
  });

  it("sets and forgets an Echo", () => {
    let s = cheat(start(), { kind: "echo", echoId: "test-echo", stage: 7 });
    expect(s.legacy.echoes["test-echo"]?.stage).toBe(7);
    s = cheat(s, { kind: "echo", echoId: "test-echo", stage: 0 });
    expect(s.legacy.echoes["test-echo"]).toBeUndefined();
  });
});
