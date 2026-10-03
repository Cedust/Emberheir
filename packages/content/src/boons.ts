import type {
  BoonDefinition,
  BoonFamilyDefinition,
  BoonSlot,
  TriggerCondition,
  TriggerEffect,
} from "@emberheir/sim";

/**
 * Stolen Fire Boons (docs/design/spielspass-umsetzung.md): one family per Warden, Hearth is always
 * open. Values are rank I at Spark grade; rank and grade scale them (see `BOONS` in the sim).
 * Percent stats are fractions (0.1 = 10 %), `value` is the number on the card.
 */
export const BOON_FAMILIES: readonly BoonFamilyDefinition[] = [
  { id: "hearth", name: "Hearth", damageTypes: [], color: "#d9a35b" },
  { id: "ash", name: "Ash", warden: "Gorrak", damageTypes: ["physical"], color: "#a39486" },
  { id: "rot", name: "Rot", warden: "Mother of Rot", damageTypes: ["physical"], color: "#7f9a3c" },
  {
    id: "cinder",
    name: "Cinder",
    warden: "Cinder Tyrant",
    damageTypes: ["fire"],
    color: "#e2572b",
  },
  { id: "rime", name: "Rime", warden: "Rime Warden", damageTypes: ["cold"], color: "#6fb4d8" },
  {
    id: "storm",
    name: "Storm",
    warden: "Storm Herald",
    damageTypes: ["lightning"],
    color: "#e6c845",
  },
  { id: "void", name: "Void", warden: "Voidborn Maw", damageTypes: ["void"], color: "#9a62d1" },
];

interface TriggerBoon {
  readonly when: TriggerCondition;
  readonly effect: TriggerEffect;
  readonly chance?: number;
  readonly cooldown?: number;
  readonly once?: boolean;
}

function boon(
  family: string,
  slot: BoonSlot,
  name: string,
  text: string,
  value: number,
  effect: Pick<BoonDefinition, "bonuses" | "rules" | "fusion"> & { readonly trigger?: TriggerBoon },
): BoonDefinition {
  const { trigger, ...rest } = effect;
  return {
    id: name.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-"),
    name,
    family,
    slot,
    text,
    value,
    ...rest,
    ...(trigger && {
      trigger: {
        name,
        condition: trigger.when,
        effect: trigger.effect,
        ...(trigger.chance !== undefined && { chance: trigger.chance }),
        ...(trigger.cooldown !== undefined && { cooldown: trigger.cooldown }),
        ...(trigger.once && { oncePerFight: true }),
      },
    }),
  };
}

const EVERY_ATTACK: TriggerCondition = { kind: "everyNthAttack", n: 1 };
const ailment = (a: "burn" | "chill" | "shock" | "corruption" | "bleed" | "poison") =>
  ({ kind: "ailment", ailment: a }) as const;

const HEARTH: readonly BoonDefinition[] = [
  boon("hearth", "reaction", "Second Wind", "Below 35 % Life: heal # % Life", 15, {
    trigger: {
      when: { kind: "lifeBelow", threshold: 0.35 },
      effect: { kind: "heal", fraction: 0.15 },
      once: true,
    },
  }),
  boon("hearth", "reaction", "Hearthguard", "Fight start: Barrier of # % Life", 10, {
    trigger: { when: { kind: "fightStart" }, effect: { kind: "barrier", fraction: 0.1 } },
  }),
  boon("hearth", "heat", "Banked Coals", "Start every fight with # Heat", 30, {
    bonuses: { startingHeat: 30 },
  }),
  boon("hearth", "heat", "Warm Hands", "Every 4 s: # Heat", 5, {
    trigger: { when: { kind: "everySeconds", seconds: 4 }, effect: { kind: "heat", amount: 5 } },
  }),
  boon("hearth", "passive", "Old Nan's Broth", "+# % Lifesteal", 1.5, {
    bonuses: { lifesteal: 0.015 },
  }),
  boon("hearth", "passive", "Thick Skin", "+# % All Resistance", 6, {
    bonuses: { allResistance: 0.06 },
  }),
  boon("hearth", "trigger", "Slow Embers", "Every 5 s: heal # % Life", 2, {
    trigger: {
      when: { kind: "everySeconds", seconds: 5 },
      effect: { kind: "heal", fraction: 0.02 },
    },
  }),
  boon("hearth", "trigger", "Ember Ward", "Hit taken: Barrier of # % Life", 5, {
    trigger: {
      when: { kind: "whenHit" },
      effect: { kind: "barrier", fraction: 0.05 },
      chance: 0.2,
      cooldown: 4,
    },
  }),
];

const ASH: readonly BoonDefinition[] = [
  boon("ash", "strike", "Crushing Blow", "Every 4th attack: extra hit for # % weapon damage", 80, {
    trigger: {
      when: { kind: "everyNthAttack", n: 4 },
      effect: { kind: "weaponHit", multiplier: 0.8 },
    },
  }),
  boon("ash", "strike", "Sundering Weight", "Default Attack deals +# % damage", 20, {
    rules: { defaultAttackDamage: 1.2 },
  }),
  boon("ash", "skill", "Ashen Momentum", "Skills: +# % Physical Damage, stacks 5×", 5, {
    trigger: {
      when: { kind: "onSkillUse" },
      effect: { kind: "buff", stat: "physicalDamage", amount: 0.05, duration: 30, maxStacks: 5 },
    },
  }),
  boon("ash", "heat", "Smouldering Rage", "Hit taken: # Heat", 5, {
    trigger: { when: { kind: "whenHit" }, effect: { kind: "heat", amount: 5 } },
  }),
  boon("ash", "passive", "Brutality", "+# % Physical Damage", 10, {
    bonuses: { physicalDamage: 0.1 },
  }),
  boon("ash", "passive", "Grit", "Reflect # % of hits taken", 12, {
    trigger: {
      when: { kind: "whenHit" },
      effect: { kind: "reflect", fraction: 0.12, cap: 0.03, damageType: "physical" },
    },
  }),
  boon("ash", "trigger", "Stagger", "Crit: stun for # s", 0.5, {
    trigger: {
      when: { kind: "onCrit" },
      effect: { kind: "stun", seconds: 0.5 },
      chance: 0.4,
      cooldown: 6,
    },
  }),
  boon("ash", "reaction", "Last Stand", "Below 50 % Life: +# % Physical Damage", 25, {
    trigger: {
      when: { kind: "lifeBelow", threshold: 0.5 },
      effect: { kind: "buff", stat: "physicalDamage", amount: 0.25, duration: 8 },
      once: true,
    },
  }),
];

const ROT: readonly BoonDefinition[] = [
  boon("rot", "strike", "Festering Edge", "Attacks: # % chance to Poison", 30, {
    trigger: { when: EVERY_ATTACK, effect: ailment("poison"), chance: 0.3 },
  }),
  boon("rot", "strike", "Serrated Edge", "Attacks: # % chance to Bleed", 20, {
    trigger: { when: EVERY_ATTACK, effect: ailment("bleed"), chance: 0.2 },
  }),
  boon("rot", "skill", "Blighted Rite", "Skills: # % chance to Poison", 30, {
    trigger: { when: { kind: "onSkillUse" }, effect: ailment("poison"), chance: 0.3 },
  }),
  boon("rot", "heat", "Blood Rush", "Crit: # Heat", 6, {
    trigger: { when: { kind: "onCrit" }, effect: { kind: "heat", amount: 6 } },
  }),
  boon("rot", "passive", "Fester", "Ailments deal +# % damage", 15, {
    rules: { dotDamage: 1.15 },
  }),
  boon("rot", "passive", "Bloodfeast", "Heal # % of ailment damage", 3, {
    rules: { dotLifesteal: 0.03 },
  }),
  boon("rot", "trigger", "Open Wounds", "Crit: # % chance to Bleed", 30, {
    trigger: { when: { kind: "onCrit" }, effect: ailment("bleed"), chance: 0.3 },
  }),
  boon("rot", "reaction", "Grave Hunger", "Below 40 % Life: +# % Lifesteal", 6, {
    trigger: {
      when: { kind: "lifeBelow", threshold: 0.4 },
      effect: { kind: "buff", stat: "lifesteal", amount: 0.06, duration: 8 },
      once: true,
    },
  }),
];

const CINDER: readonly BoonDefinition[] = [
  boon("cinder", "strike", "Kindled Strikes", "Attacks: # % chance to Burn", 30, {
    trigger: { when: EVERY_ATTACK, effect: ailment("burn"), chance: 0.3 },
  }),
  boon("cinder", "skill", "Searing Rite", "Skills: # % chance to Burn", 30, {
    trigger: { when: { kind: "onSkillUse" }, effect: ailment("burn"), chance: 0.3 },
  }),
  boon("cinder", "heat", "Fire Within", "Skills cost # % less Heat", 15, {
    rules: { skillCostMultiplier: 0.85 },
  }),
  boon("cinder", "passive", "Stoked Pyre", "+# % Elemental Damage", 10, {
    bonuses: { elementalDamage: 0.1 },
  }),
  boon("cinder", "passive", "Melt", "+# % Elemental Penetration", 7, {
    bonuses: { elementalPenetration: 0.07 },
  }),
  boon("cinder", "trigger", "Flashover", "Every 6 s: a flare for # % weapon damage", 80, {
    trigger: {
      when: { kind: "everySeconds", seconds: 6 },
      effect: { kind: "weaponHit", multiplier: 0.8 },
    },
  }),
  boon("cinder", "trigger", "Wildfire", "Crit: +# % Attack Speed, stacks 3×", 5, {
    trigger: {
      when: { kind: "onCrit" },
      effect: { kind: "buff", stat: "attackSpeed", amount: 0.05, duration: 4, maxStacks: 3 },
    },
  }),
  boon("cinder", "reaction", "Blazing Defiance", "Below 30 % Life: +# % Elemental Damage", 30, {
    trigger: {
      when: { kind: "lifeBelow", threshold: 0.3 },
      effect: { kind: "buff", stat: "elementalDamage", amount: 0.3, duration: 8 },
      once: true,
    },
  }),
];

const RIME: readonly BoonDefinition[] = [
  boon("rime", "strike", "Frostbite", "Attacks: # % chance to Chill", 30, {
    trigger: { when: EVERY_ATTACK, effect: ailment("chill"), chance: 0.3 },
  }),
  boon("rime", "skill", "Frost Rite", "Skills: Barrier of # % Life", 3, {
    trigger: { when: { kind: "onSkillUse" }, effect: { kind: "barrier", fraction: 0.03 } },
  }),
  boon("rime", "heat", "Cold Heart", "Heat no longer cools down", 0, {
    rules: { noHeatDecay: true },
  }),
  boon("rime", "passive", "Shatter", "+# % Crit Chance", 4, {
    bonuses: { critChance: 0.04 },
  }),
  boon("rime", "passive", "Ice Wall", "+# % Block Chance", 5, {
    bonuses: { blockChance: 0.05 },
  }),
  boon("rime", "passive", "Permafrost", "+# % Ailment Duration", 15, {
    bonuses: { ailmentDuration: 0.15 },
  }),
  boon("rime", "trigger", "Frost Nip", "Hit taken: # % chance to Chill", 25, {
    trigger: { when: { kind: "whenHit" }, effect: ailment("chill"), chance: 0.25, cooldown: 3 },
  }),
  boon("rime", "reaction", "Ice Shell", "Enemy wind-up: Barrier of # % Life", 12, {
    trigger: { when: { kind: "enemyWindup" }, effect: { kind: "barrier", fraction: 0.12 } },
  }),
];

const STORM: readonly BoonDefinition[] = [
  boon("storm", "strike", "Static Echo", "Every 3rd attack: # % chance to attack again", 30, {
    trigger: {
      when: { kind: "everyNthAttack", n: 3 },
      effect: { kind: "extraAttack" },
      chance: 0.3,
    },
  }),
  boon("storm", "skill", "Overload", "Skills: # % chance to Shock", 30, {
    trigger: { when: { kind: "onSkillUse" }, effect: ailment("shock"), chance: 0.3 },
  }),
  boon("storm", "heat", "Charged Air", "+# % Heat Gain", 12, {
    bonuses: { heatGain: 0.12 },
  }),
  boon("storm", "passive", "Quickening", "+# % Attack Speed", 6, {
    bonuses: { attackSpeed: 0.06 },
  }),
  boon("storm", "passive", "Blur", "+# % Evasion", 4, {
    bonuses: { evasion: 0.04 },
  }),
  boon("storm", "passive", "Conductor", "+# % chance to Shock", 8, {
    bonuses: { shockChance: 0.08 },
  }),
  boon("storm", "trigger", "Lightning Reflexes", "Evade: # % chance to strike back", 25, {
    trigger: {
      when: { kind: "onEvade" },
      effect: { kind: "extraAttack" },
      chance: 0.25,
      cooldown: 2,
    },
  }),
  boon("storm", "reaction", "Sidestep", "Enemy wind-up: +# % Evasion", 30, {
    trigger: {
      when: { kind: "enemyWindup" },
      effect: { kind: "buff", stat: "evasion", amount: 0.3, duration: 3 },
    },
  }),
];

const VOID: readonly BoonDefinition[] = [
  boon("void", "strike", "Hollow Touch", "Attacks: # % chance to Corrupt", 30, {
    trigger: { when: EVERY_ATTACK, effect: ailment("corruption"), chance: 0.3 },
  }),
  boon("void", "skill", "Gathering Dark", "Skills: +# % Elemental Damage, stacks 5×", 5, {
    trigger: {
      when: { kind: "onSkillUse" },
      effect: { kind: "buff", stat: "elementalDamage", amount: 0.05, duration: 30, maxStacks: 5 },
    },
  }),
  boon("void", "heat", "Void Siphon", "Hits may give # Heat", 4, {
    trigger: {
      when: { kind: "onHit" },
      effect: { kind: "heat", amount: 4 },
      chance: 0.3,
      cooldown: 1,
    },
  }),
  boon("void", "passive", "Hollow Mark", "+# % damage to enemies below 30 % Life", 15, {
    rules: { execute: { below: 0.3, bonus: 0.15 } },
  }),
  boon("void", "passive", "Creeping Void", "+# % chance to Corrupt", 8, {
    bonuses: { corruptionChance: 0.08 },
  }),
  boon("void", "passive", "Null Ward", "+# % Tenacity", 10, {
    bonuses: { tenacity: 0.1 },
  }),
  boon("void", "trigger", "Void Mirror", "Hit taken: reflect # % of it", 30, {
    trigger: {
      when: { kind: "whenHit" },
      effect: { kind: "reflect", fraction: 0.3, cap: 0.05, damageType: "void" },
      chance: 0.25,
      cooldown: 4,
    },
  }),
  boon("void", "reaction", "Event Horizon", "Below 30 % Life: Barrier of # % Life", 20, {
    trigger: {
      when: { kind: "lifeBelow", threshold: 0.3 },
      effect: { kind: "barrier", fraction: 0.2 },
      once: true,
    },
  }),
];

/** Fusion Boons: offered only once the hero holds Boons of both families. */
const FUSIONS: readonly BoonDefinition[] = [
  boon("ash", "trigger", "Iron Hearth", "First seconds of a fight: +# % Attack Speed", 25, {
    fusion: ["ash", "hearth"],
    trigger: {
      when: { kind: "fightStart" },
      effect: { kind: "buff", stat: "attackSpeed", amount: 0.25, duration: 6 },
    },
  }),
  boon("cinder", "passive", "Fever", "Your Burn also Poisons", 0, {
    fusion: ["rot", "cinder"],
    rules: { ailmentEcho: [{ from: "burn", to: "poison" }] },
  }),
  boon("cinder", "trigger", "Steam Burst", "Crit: Steam Burst for # % weapon damage", 120, {
    fusion: ["cinder", "rime"],
    trigger: {
      when: { kind: "onCrit" },
      effect: { kind: "weaponHit", multiplier: 1.2 },
      cooldown: 4,
    },
  }),
  boon("storm", "passive", "Galvanic Rot", "Your Shock also Bleeds", 0, {
    fusion: ["rot", "storm"],
    rules: { ailmentEcho: [{ from: "shock", to: "bleed" }] },
  }),
  boon("storm", "trigger", "Hailstorm", "Every 5 s: a hailstone for # % weapon damage", 100, {
    fusion: ["rime", "storm"],
    trigger: {
      when: { kind: "everySeconds", seconds: 5 },
      effect: { kind: "weaponHit", multiplier: 1 },
    },
  }),
  boon("void", "passive", "Black Hearth", "Heal # % of ailment damage", 6, {
    fusion: ["hearth", "void"],
    rules: { dotLifesteal: 0.06 },
  }),
  boon("ash", "passive", "Molten Edge", "Default Attack deals +# % damage", 30, {
    fusion: ["ash", "cinder"],
    rules: { defaultAttackDamage: 1.3 },
  }),
];

export const BOONS_CONTENT: readonly BoonDefinition[] = [
  ...HEARTH,
  ...ASH,
  ...ROT,
  ...CINDER,
  ...RIME,
  ...STORM,
  ...VOID,
  ...FUSIONS,
];
