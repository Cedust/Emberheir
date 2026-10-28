import { HERO_SKILLS, HERO_WEAPONS, SKILL_TREE } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { skillDamageTypes, skillText } from "./SkillMeta";

const skill = (id: string) => {
  const found = HERO_SKILLS.find((s) => s.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe("skillDamageTypes", () => {
  it("shows the weapon's damage type for weapon hits", () => {
    expect(skillDamageTypes(skill("power-strike"), "fire")).toEqual(["fire"]);
    expect(skillDamageTypes(skill("power-strike"))).toEqual(["physical"]);
  });

  it("shows nothing for a skill without damage", () => {
    expect(skillDamageTypes(skill("iron-bastion"), "physical")).toEqual([]);
  });
});

describe("skillText", () => {
  it("names the weapon's ailment and element in Mastery skills", () => {
    const blast = SKILL_TREE.nodes.find((n) => n.skill?.id === "arcane-blast")?.skill;
    if (!blast) throw new Error("arcane-blast");
    const base = HERO_WEAPONS.find((w) => w.id === "wand");
    if (!base) throw new Error("wand");
    const wand = { ...base, damageType: "lightning" as const, ailment: "shock" as const };
    const text = skillText(blast, wand);
    expect(text).toContain("your Shock already on the enemy");
    expect(text).toContain("as Lightning");
    expect(skillText(blast)).toContain("your element");
  });
});
