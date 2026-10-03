import type { TriggerConditionPart, TriggerEffectPart } from "@emberheir/sim";

/**
 * Trigger Codex parts (docs/design/trigger-codex-v1.md section 4). Salvaging a trigger affix
 * teaches its Condition and Effect; Kindle at Liora combines any two. Each part has a home where
 * it drops more often: attack Conditions with Skirmishers, defense Conditions with Brutes,
 * skill/time Conditions with Casters, element Effects in their act, rare Effects with bosses.
 */

const ATTACKERS = ["skirmisher"];
const DEFENDERS = ["brute", "thornback", "warden"];
const CASTERS = ["caster", "afflicter"];

export const TRIGGER_CONDITIONS: readonly TriggerConditionPart[] = [
  // Attack
  {
    id: "on-hit",
    name: "On Hit",
    condition: { kind: "onHit" },
    chance: 0.25,
    cooldown: 1,
    home: { archetypes: ATTACKERS },
  },
  {
    id: "on-crit",
    name: "On Crit",
    condition: { kind: "onCrit" },
    cooldown: 1,
    home: { archetypes: ATTACKERS },
  },
  {
    id: "every-4th-attack",
    name: "Every 4th Attack",
    condition: { kind: "everyNthAttack", n: 4 },
    home: { archetypes: ATTACKERS },
  },
  // Defense
  {
    id: "when-hit",
    name: "When Hit",
    condition: { kind: "whenHit" },
    chance: 0.5,
    cooldown: 3,
    home: { archetypes: DEFENDERS },
  },
  {
    id: "on-block",
    name: "On Block",
    condition: { kind: "onBlock" },
    cooldown: 1,
    home: { archetypes: DEFENDERS },
  },
  {
    id: "on-evade",
    name: "On Evade",
    condition: { kind: "onEvade" },
    cooldown: 1,
    home: { archetypes: DEFENDERS },
  },
  {
    id: "low-life",
    name: "Below 35 % Life",
    condition: { kind: "lifeBelow", threshold: 0.35 },
    oncePerFight: true,
    home: { archetypes: DEFENDERS },
  },
  {
    id: "half-life",
    name: "Below 50 % Life",
    condition: { kind: "lifeBelow", threshold: 0.5 },
    oncePerFight: true,
    home: { archetypes: DEFENDERS },
  },
  // Skill, time
  {
    id: "on-skill-use",
    name: "On Skill Use",
    condition: { kind: "onSkillUse" },
    home: { archetypes: CASTERS },
  },
  {
    id: "every-6s",
    name: "Every 6 s",
    condition: { kind: "everySeconds", seconds: 6 },
    home: { archetypes: CASTERS },
  },
  {
    id: "every-8s",
    name: "Every 8 s",
    condition: { kind: "everySeconds", seconds: 8 },
    home: { archetypes: CASTERS },
  },
  {
    id: "fight-start",
    name: "Fight Start",
    condition: { kind: "fightStart" },
    oncePerFight: true,
    home: { archetypes: CASTERS },
  },
];

const AILMENT = { rolls: "chance", value: { min: 0.25, max: 0.5 }, perTier: 0 } as const;

export const TRIGGER_EFFECTS: readonly TriggerEffectPart[] = [
  {
    id: "weapon-hit",
    name: "Crushing Blow",
    effect: { kind: "weaponHit" },
    rolls: "magnitude",
    value: { min: 0.8, max: 1.4 },
    perTier: 0,
    home: { actId: "ashen-fields" },
  },
  {
    id: "bleed",
    name: "Rend",
    effect: { kind: "ailment", ailment: "bleed" },
    ...AILMENT,
    cooldown: 1,
    home: { actId: "rotwood" },
  },
  {
    id: "poison",
    name: "Venom",
    effect: { kind: "ailment", ailment: "poison" },
    ...AILMENT,
    home: { actId: "rotwood" },
  },
  {
    id: "burn",
    name: "Sear",
    effect: { kind: "ailment", ailment: "burn" },
    ...AILMENT,
    cooldown: 1,
    home: { actId: "ember-wastes" },
  },
  {
    id: "flame-pulse",
    name: "Flame Pulse",
    effect: {
      kind: "spellHit",
      name: "Flame Pulse",
      damage: { min: 6, max: 10 },
      damageType: "fire",
    },
    rolls: "magnitude",
    value: { min: 1, max: 1.5 },
    perTier: 1,
    home: { actId: "ember-wastes" },
  },
  {
    id: "chill",
    name: "Frostbite",
    effect: { kind: "ailment", ailment: "chill" },
    ...AILMENT,
    cooldown: 3,
    home: { actId: "frost-peaks" },
  },
  {
    id: "shock",
    name: "Static",
    effect: { kind: "ailment", ailment: "shock" },
    ...AILMENT,
    cooldown: 3,
    home: { actId: "storm-spires" },
  },
  {
    id: "heal",
    name: "Second Wind",
    effect: { kind: "heal" },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.18 },
    perTier: 0.1,
    cooldown: 10,
    home: { archetypes: ["warden"] },
  },
  {
    id: "attack-speed",
    name: "Fleetfoot",
    effect: { kind: "buff", stat: "attackSpeed", duration: 4, maxStacks: 2 },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.2 },
    perTier: 0.1,
    cooldown: 1,
    home: { archetypes: ATTACKERS },
  },
  {
    id: "crit-chance",
    name: "Battle Focus",
    effect: { kind: "buff", stat: "critChance", duration: 4, maxStacks: 3 },
    rolls: "magnitude",
    value: { min: 0.04, max: 0.08 },
    perTier: 0.1,
    cooldown: 1,
    home: { archetypes: ATTACKERS },
  },
  {
    id: "evasion",
    name: "Quickstep",
    effect: { kind: "buff", stat: "evasion", duration: 3 },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.2 },
    perTier: 0.1,
    cooldown: 3,
    home: { archetypes: ATTACKERS },
  },
  // Rare: bosses
  {
    id: "barrier",
    name: "Stoneskin",
    effect: { kind: "barrier" },
    rolls: "magnitude",
    value: { min: 0.06, max: 0.12 },
    perTier: 0.1,
    cooldown: 8,
    home: { boss: true },
  },
  {
    id: "heat",
    name: "Ember Mind",
    effect: { kind: "heat" },
    rolls: "magnitude",
    value: { min: 5, max: 10 },
    perTier: 0.1,
    cooldown: 3,
    home: { boss: true },
  },
  {
    id: "extra-attack",
    name: "Riposte",
    effect: { kind: "extraAttack" },
    rolls: "chance",
    value: { min: 0.3, max: 0.6 },
    perTier: 0,
    cooldown: 2,
    home: { boss: true },
  },
];
