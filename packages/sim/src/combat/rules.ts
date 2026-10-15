import type { AilmentType, CombatRules, Element } from "./types";

/**
 * Combines rules from several sources (Keystones, Legendary Powers, Runewords): extra damage
 * taken adds up, multipliers multiply, flags switch on, echoes and conditional bonuses collect,
 * and the strongest Execute wins.
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
  let hitDamage = 1;
  let chilledDamage = 1;
  let barrierRecharge = 1;
  const ailmentDamage: Partial<Record<AilmentType, number>> = {};
  const maxResistance: Partial<Record<Element, number>> = {};
  const ailmentEcho: NonNullable<CombatRules["ailmentEcho"]>[number][] = [];
  let execute: CombatRules["execute"];
  let heavyHitCap: number | undefined;
  const conditionalDamage: NonNullable<CombatRules["conditionalDamage"]>[number][] = [];
  const conditionalCrit: NonNullable<CombatRules["conditionalCrit"]>[number][] = [];
  const ailmentDamageWhen: NonNullable<CombatRules["ailmentDamageWhen"]>[number][] = [];
  const conversion: NonNullable<CombatRules["conversion"]>[number][] = [];
  // Class Traits come from one source (the class): the first one wins.
  let ironBlood: CombatRules["ironBlood"];
  let keenEye = false;
  let spark: CombatRules["spark"];
  let lingering: CombatRules["lingering"];
  let spellblade: CombatRules["spellblade"];
  let arcaneConduit = false;
  let corruptionStopsHeal = false;
  let slowDeath: CombatRules["slowDeath"];
  for (const r of sources) {
    if (!r) continue;
    ironBlood ??= r.ironBlood;
    keenEye ||= r.keenEye ?? false;
    spark ??= r.spark;
    lingering ??= r.lingering;
    spellblade ??= r.spellblade;
    arcaneConduit ||= r.arcaneConduit ?? false;
    corruptionStopsHeal ||= r.corruptionStopsHeal ?? false;
    slowDeath ??= r.slowDeath;
    damageTaken += r.damageTaken ?? 0;
    skillCostMultiplier *= r.skillCostMultiplier ?? 1;
    defaultAttackDamage *= r.defaultAttackDamage ?? 1;
    noHeatDecay ||= r.noHeatDecay ?? false;
    critsApplyBleed ||= r.critsApplyBleed ?? false;
    critChanceMultiplier *= r.critChanceMultiplier ?? 1;
    dotLifesteal += r.dotLifesteal ?? 0;
    dotDamage *= r.dotDamage ?? 1;
    lifeMultiplier *= r.lifeMultiplier ?? 1;
    hitDamage *= r.hitDamage ?? 1;
    chilledDamage *= r.chilledDamage ?? 1;
    barrierRecharge *= r.barrierRecharge ?? 1;
    for (const [ailment, factor] of Object.entries(r.ailmentDamage ?? {}) as [
      AilmentType,
      number,
    ][]) {
      ailmentDamage[ailment] = (ailmentDamage[ailment] ?? 1) * factor;
    }
    for (const [element, extra] of Object.entries(r.maxResistance ?? {}) as [Element, number][]) {
      maxResistance[element] = (maxResistance[element] ?? 0) + extra;
    }
    for (const echo of r.ailmentEcho ?? []) {
      if (!ailmentEcho.some((e) => e.from === echo.from && e.to === echo.to))
        ailmentEcho.push(echo);
    }
    conditionalDamage.push(...(r.conditionalDamage ?? []));
    conditionalCrit.push(...(r.conditionalCrit ?? []));
    ailmentDamageWhen.push(...(r.ailmentDamageWhen ?? []));
    conversion.push(...(r.conversion ?? []));
    if (r.heavyHitCap !== undefined) heavyHitCap = Math.max(heavyHitCap ?? 0, r.heavyHitCap);
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
    ...(hitDamage !== 1 ? { hitDamage } : {}),
    ...(chilledDamage !== 1 ? { chilledDamage } : {}),
    ...(barrierRecharge !== 1 ? { barrierRecharge } : {}),
    ...(Object.keys(ailmentDamage).length ? { ailmentDamage } : {}),
    ...(Object.keys(maxResistance).length ? { maxResistance } : {}),
    ...(ailmentEcho.length ? { ailmentEcho } : {}),
    ...(execute ? { execute } : {}),
    ...(heavyHitCap !== undefined ? { heavyHitCap } : {}),
    ...(conditionalDamage.length ? { conditionalDamage } : {}),
    ...(conditionalCrit.length ? { conditionalCrit } : {}),
    ...(ailmentDamageWhen.length ? { ailmentDamageWhen } : {}),
    ...(conversion.length ? { conversion } : {}),
    ...(ironBlood ? { ironBlood } : {}),
    ...(keenEye ? { keenEye } : {}),
    ...(spark ? { spark } : {}),
    ...(lingering ? { lingering } : {}),
    ...(spellblade ? { spellblade } : {}),
    ...(arcaneConduit ? { arcaneConduit } : {}),
    ...(corruptionStopsHeal ? { corruptionStopsHeal } : {}),
    ...(slowDeath ? { slowDeath } : {}),
  };
}
