import type { AilmentType, CombatRules } from "./types";

/**
 * Combines rules from several sources (Keystones, Legendary Powers, Runewords): extra damage
 * taken adds up, multipliers multiply, flags switch on, echoes collect, and the strongest
 * Execute wins.
 */
export function mergeRules(...sources: readonly (CombatRules | undefined)[]): CombatRules {
  let damageTaken = 0;
  let skillCostMultiplier = 1;
  let defaultAttackDamage = 1;
  let noHeatDecay = false;
  let critsApplyBleed = false;
  let critChanceMultiplier = 1;
  let dotLifesteal = 0;
  let dotDamage = 1;
  let lifeMultiplier = 1;
  const ailmentDamage: Partial<Record<AilmentType, number>> = {};
  const ailmentEcho: NonNullable<CombatRules["ailmentEcho"]>[number][] = [];
  let execute: CombatRules["execute"];
  for (const r of sources) {
    if (!r) continue;
    damageTaken += r.damageTaken ?? 0;
    skillCostMultiplier *= r.skillCostMultiplier ?? 1;
    defaultAttackDamage *= r.defaultAttackDamage ?? 1;
    noHeatDecay ||= r.noHeatDecay ?? false;
    critsApplyBleed ||= r.critsApplyBleed ?? false;
    critChanceMultiplier *= r.critChanceMultiplier ?? 1;
    dotLifesteal += r.dotLifesteal ?? 0;
    dotDamage *= r.dotDamage ?? 1;
    lifeMultiplier *= r.lifeMultiplier ?? 1;
    for (const [ailment, factor] of Object.entries(r.ailmentDamage ?? {}) as [
      AilmentType,
      number,
    ][]) {
      ailmentDamage[ailment] = (ailmentDamage[ailment] ?? 1) * factor;
    }
    for (const echo of r.ailmentEcho ?? []) {
      if (!ailmentEcho.some((e) => e.from === echo.from && e.to === echo.to))
        ailmentEcho.push(echo);
    }
    if (r.execute && (!execute || r.execute.bonus > execute.bonus)) execute = r.execute;
  }
  return {
    damageTaken,
    skillCostMultiplier,
    defaultAttackDamage,
    noHeatDecay,
    critsApplyBleed,
    critChanceMultiplier,
    ...(dotLifesteal > 0 ? { dotLifesteal } : {}),
    ...(dotDamage !== 1 ? { dotDamage } : {}),
    ...(lifeMultiplier !== 1 ? { lifeMultiplier } : {}),
    ...(Object.keys(ailmentDamage).length ? { ailmentDamage } : {}),
    ...(ailmentEcho.length ? { ailmentEcho } : {}),
    ...(execute ? { execute } : {}),
  };
}
