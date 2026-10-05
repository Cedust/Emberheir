import { COMBAT } from "../combat/constants";
import { type DerivedStats, deriveStats } from "../combat/stats";
import type { CombatantSetup, HeatBehavior } from "../combat/types";
import type { EquipmentSlot, Item } from "../items/types";
import { type GameData, type GameState, heroSetup, targetSlot } from "./game";

/**
 * Rough numbers for the UI: a DPS estimate, Heat per second and an item comparison. They read
 * the same derived stats the fight uses, but skip enemies, skills and randomness, so they are
 * estimates only ("Estimate vs. a target without defenses").
 */

/**
 * Default Attack damage per second: average weapon hit × attack speed × damage % × crits, plus
 * the damage-over-time ailments those hits cause (Burn and Bleed refresh, so at most one runs at
 * a time; Poison stacks).
 */
export function estimateDps(setup: CombatantSetup, stats: DerivedStats = deriveStats(setup)) {
  const { weapon } = setup;
  const average = (weapon.damage.min + weapon.damage.max) / 2;
  const bonus = weapon.damageType === "physical" ? stats.physicalDamage : stats.elementalDamage;
  const crit = 1 + stats.critChance * (COMBAT.critMultiplier - 1);
  const hit = average * (1 + bonus) * crit;
  const aps = stats.attackSpeed;
  const chance = (ailment: "burn" | "bleed" | "poison") =>
    Math.min(
      1,
      (weapon.ailmentChances?.find((c) => c.ailment === ailment)?.chance ?? 0) +
        stats[`${ailment}Chance`] +
        (ailment === "bleed" && setup.rules?.critsApplyBleed ? stats.critChance : 0),
    );
  const duration = (base: number) => base * (1 + stats.ailmentDuration);
  const refreshing = (ailment: "burn" | "bleed", perSecond: number, base: number) =>
    Math.min(1, chance(ailment) * aps * duration(base)) * hit * perSecond;
  const dots =
    refreshing("burn", COMBAT.burnDamagePerSecond, COMBAT.burnDurationSeconds) +
    refreshing("bleed", COMBAT.bleedDamagePerSecond, COMBAT.bleedDurationSeconds) +
    Math.min(
      COMBAT.poisonMaxStacks,
      chance("poison") * aps * duration(COMBAT.poisonDurationSeconds),
    ) *
      hit *
      COMBAT.poisonDamagePerSecond;
  return hit * aps + dots;
}

/**
 * Heat per second from own Default Attacks (Warming: per second) minus Cooling, without hits
 * taken.
 */
export function heatPerSecond(setup: CombatantSetup, stats: DerivedStats = deriveStats(setup)) {
  const behavior: HeatBehavior = setup.weapon.heatBehavior;
  const raw =
    behavior === "warming"
      ? COMBAT.warmingHeatPerSecond
      : setup.weapon.heatPerHit * stats.attackSpeed;
  const gain = raw * (1 + stats.heatGain);
  return behavior === "cooling" && !setup.rules?.noHeatDecay
    ? Math.max(0, gain - COMBAT.coolingDecayPerSecond)
    : gain;
}

/** One step of "One rotation": a skill fires after waiting `wait` seconds for Heat. */
export interface RotationStep {
  readonly slot: number;
  readonly wait: number;
}

/**
 * One steady rotation (Kaelen's "One rotation" chain): Heat builds at a fixed rate, each slot
 * fires once Heat reaches its threshold and pays its cost. The first round is skipped because
 * Starting Heat distorts it. Empty if Heat never builds or no skill can fire.
 */
export function estimateRotation(
  slots: readonly { readonly heatCost: number; readonly threshold: number }[],
  rate: number,
  startingHeat = 0,
): RotationStep[] {
  if (slots.length === 0 || rate <= 0) return [];
  const dt = 0.05;
  let heat = Math.min(COMBAT.maxHeat, startingHeat);
  let pointer = 0;
  let time = 0;
  let last = 0;
  const fired: RotationStep[] = [];
  while (fired.length < slots.length * 2 && time < 120) {
    time += dt;
    heat = Math.min(COMBAT.maxHeat, heat + rate * dt);
    const slot = slots[pointer % slots.length];
    if (slot && heat >= Math.min(COMBAT.maxHeat, Math.max(slot.heatCost, slot.threshold))) {
      heat -= slot.heatCost;
      fired.push({ slot: pointer % slots.length, wait: Number((time - last).toFixed(2)) });
      last = time;
      pointer++;
    }
  }
  return fired.length >= slots.length * 2 ? fired.slice(slots.length) : fired;
}

export interface StatChange {
  readonly stat: keyof DerivedStats | "dps";
  readonly before: number;
  readonly after: number;
}

export interface ItemComparison {
  readonly slot: EquipmentSlot | undefined;
  /** The item it would replace, if any. */
  readonly replaces: Item | undefined;
  readonly dps: { readonly before: number; readonly after: number };
  /** Stats that change, biggest relative change first. */
  readonly changes: readonly StatChange[];
  /** Trigger affixes on the new item minus those on the old one. */
  readonly triggerDelta: number;
}

const COMPARED: readonly (keyof DerivedStats)[] = [
  "maxLife",
  "armor",
  "physicalDamage",
  "elementalDamage",
  "critChance",
  "attackSpeed",
  "evasion",
  "blockChance",
  "resistance",
  "fireResistance",
  "coldResistance",
  "lightningResistance",
  "voidResistance",
  "heatGain",
  "startingHeat",
  "tenacity",
  "lifesteal",
  "triggerChance",
  "corruptionChance",
  "bleedChance",
  "poisonChance",
  "ailmentDuration",
];

/** What changes if the hero equips `item` (it goes to the slot Equip would use). */
export function compareItem(
  state: GameState,
  data: GameData,
  item: Item,
  preferred?: EquipmentSlot,
): ItemComparison {
  const slot = targetSlot(item, data, state.hero.equipment, preferred);
  const replaces = slot ? state.hero.equipment[slot] : undefined;
  const before = heroSetup(state, data).setup;
  const after = slot
    ? heroSetup(
        {
          ...state,
          hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: item } },
        },
        data,
      ).setup
    : before;
  const sb = deriveStats(before);
  const sa = deriveStats(after);
  const changes = COMPARED.flatMap((stat): StatChange[] =>
    Math.abs(sa[stat] - sb[stat]) > 1e-6 ? [{ stat, before: sb[stat], after: sa[stat] }] : [],
  ).sort((a, b) => relative(b) - relative(a));
  const triggers = (it: Item | undefined) =>
    it?.affixes.filter((r) => data.items.affixes.get(r.affixId)?.kind === "trigger").length ?? 0;
  return {
    slot,
    replaces,
    dps: { before: estimateDps(before, sb), after: estimateDps(after, sa) },
    changes,
    triggerDelta: triggers(item) - triggers(replaces),
  };
}

const relative = (c: StatChange) =>
  Math.abs(c.after - c.before) / Math.max(1e-6, Math.abs(c.before) || 1);
