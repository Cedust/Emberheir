import { HERO_SKILLS } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { skillDamageTypes } from "./SkillMeta";

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
