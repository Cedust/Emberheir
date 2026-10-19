import { describe, expect, it } from "vitest";
import { applyAction, heroSetup, learnPath, newGame } from "@emberheir/sim";
import { GAME_DATA } from "./game";
import { RUNES } from "./legendary";

/** Rune Sockets of the Skill Web (neuausrichtung-v1.md 4.2). */
describe("Rune Sockets in the web", () => {
  const sockets = GAME_DATA.skillTree.nodes.filter((n) => n.kind === "socket");

  it("one socket per region, and every Rune has a web effect", () => {
    expect(sockets).toHaveLength(9);
    expect(new Set(sockets.map((s) => s.region)).size).toBe(9);
    for (const rune of RUNES) expect(rune.web?.description, rune.id).toBeTruthy();
  });

  it("a learned socket takes a Rune from the pouch; a respec gives it back", () => {
    let s = newGame(GAME_DATA, { seed: 2, classId: "cinderguard" });
    s = {
      ...s,
      hero: { ...s.hero, unspentSkillPoints: 20 },
      wallet: { ...s.wallet, acorns: 10_000, runes: { rime: 1 } },
      progress: { ...s.progress, trainerUnlocked: true },
    };
    const socket = "steel-rune-socket";
    const path = learnPath(GAME_DATA.skillTree, s.hero.learned, socket) ?? [];
    expect(path.at(-1)).toBe(socket);
    s = applyAction(s, GAME_DATA, { type: "learnNodes", nodeIds: path });
    s = applyAction(s, GAME_DATA, { type: "socketWebRune", nodeId: socket, runeId: "rime" });
    expect(s.hero.webRunes).toEqual({ [socket]: "rime" });
    expect(s.wallet.runes.rime ?? 0).toBe(0);
    const { setup } = heroSetup(s, GAME_DATA);
    expect(setup.rules?.conditionalDamage?.some((c) => c.amount === 0.12)).toBe(true);
    expect(() =>
      applyAction(s, GAME_DATA, { type: "socketWebRune", nodeId: socket, runeId: "rime" }),
    ).toThrow(/pouch/);
    s = applyAction(s, GAME_DATA, { type: "respecTree" });
    expect(s.hero.webRunes).toEqual({});
    expect(s.wallet.runes.rime).toBe(1);
  });

  it("each Rune works once: a second socket cannot take the same Rune", () => {
    let s = newGame(GAME_DATA, { seed: 2, classId: "cinderguard" });
    s = {
      ...s,
      hero: { ...s.hero, unspentSkillPoints: 60 },
      wallet: { ...s.wallet, acorns: 10_000, runes: { rime: 2, moss: 1 } },
      progress: { ...s.progress, trainerUnlocked: true },
    };
    const [first, second] = ["steel-rune-socket", "blood-rune-socket"];
    for (const socket of [first, second]) {
      const path = learnPath(GAME_DATA.skillTree, s.hero.learned, socket) ?? [];
      s = applyAction(s, GAME_DATA, { type: "learnNodes", nodeIds: path });
    }
    s = applyAction(s, GAME_DATA, { type: "socketWebRune", nodeId: first, runeId: "rime" });
    expect(() =>
      applyAction(s, GAME_DATA, { type: "socketWebRune", nodeId: second, runeId: "rime" }),
    ).toThrow(/another socket/);
    s = applyAction(s, GAME_DATA, { type: "socketWebRune", nodeId: second, runeId: "moss" });
    expect(s.hero.webRunes).toEqual({ [first]: "rime", [second]: "moss" });
    // An older save with the same Rune twice: it counts once.
    const twice = { ...s, hero: { ...s.hero, webRunes: { [first]: "rime", [second]: "rime" } } };
    const rime = (state: typeof s) =>
      heroSetup(state, GAME_DATA).setup.rules?.conditionalDamage?.filter((c) => c.amount === 0.12)
        .length;
    expect(rime(twice)).toBe(1);
  });
});
