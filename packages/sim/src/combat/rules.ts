import type { AilmentType, CombatRules, Element } from "./types";

/**
 * Damage factors split into one pool each (balancing-neustart-v1.md, step 2): bonuses (factors
 * above 1) add up as "more" (`×1.2` and `×1.3` give +50 %), penalties (factors below 1) multiply
 * as "less". Merged rules keep the penalties in the factor and the bonuses in its `…More` field,
 * so merging merged rules again changes nothing.
 */
export function damageSplit(
  factor: number | undefined,
  more: number | undefined,
): [number, number] {
  const f = factor ?? 1;
  return f >= 1 ? [1, f - 1 + (more ?? 0)] : [f, more ?? 0];
}

/**
 * Combines rules from several sources (Keystones, Legendary Powers, Runewords): extra damage
 * taken adds up, damage bonuses add up into their pool while penalties multiply, other
 * multipliers multiply, flags switch on, echoes and conditional bonuses collect, and the
 * strongest Execute wins.
 */
export function mergeRules(...sources: readonly (CombatRules | undefined)[]): CombatRules {
  let damageTaken = 0;
  let skillCostMultiplier = 1;
  let defaultAttackDamage = 1;
  let defaultAttackMore = 0;
  let noHeatDecay = false;
  let critsApplyBleed = false;
  let critChanceMultiplier = 1;
  let dotLifesteal = 0;
  let dotDamage = 1;
  let dotMore = 0;
  let lifeMultiplier = 1;
  let hitDamage = 1;
  let hitMore = 0;
  let chilledDamage = 1;
  let chilledMore = 0;
  let barrierRecharge = 1;
  let skillDamage = 0;
  let ailmentChance = 0;
  let ailmentDuration = 0;
  let critsApplyAilment = false;
  const ailmentDamage: Partial<Record<AilmentType, number>> = {};
  const ailmentMore: Partial<Record<AilmentType, number>> = {};
  const maxResistance: Partial<Record<Element, number>> = {};
  const ailmentEcho: NonNullable<CombatRules["ailmentEcho"]>[number][] = [];
  let execute: CombatRules["execute"];
  let heavyHitCap: number | undefined;
  const conditionalDamage: NonNullable<CombatRules["conditionalDamage"]>[number][] = [];
  const conditionalCrit: NonNullable<CombatRules["conditionalCrit"]>[number][] = [];
  const ailmentDamageWhen: NonNullable<CombatRules["ailmentDamageWhen"]>[number][] = [];
  const conversion: NonNullable<CombatRules["conversion"]>[number][] = [];
  const twinCast: number[] = [];
  // Class Traits come from one source (the class): the first one wins.
  let fury: CombatRules["fury"];
  let huntersMark: CombatRules["huntersMark"];
  let overcharge: CombatRules["overcharge"];
  let spark: CombatRules["spark"];
  let lingering: CombatRules["lingering"];
  let spellblade: CombatRules["spellblade"];
  let arcaneConduit = false;
  let corruptionStopsHeal = false;
  let slowDeath: CombatRules["slowDeath"];
  for (const r of sources) {
    if (!r) continue;
    fury ??= r.fury;
    huntersMark ??= r.huntersMark;
    overcharge ??= r.overcharge;
    spark ??= r.spark;
    lingering ??= r.lingering;
    spellblade ??= r.spellblade;
    arcaneConduit ||= r.arcaneConduit ?? false;
    corruptionStopsHeal ||= r.corruptionStopsHeal ?? false;
    slowDeath ??= r.slowDeath;
    damageTaken += r.damageTaken ?? 0;
    skillCostMultiplier *= r.skillCostMultiplier ?? 1;
    const [daLess, daMore] = damageSplit(r.defaultAttackDamage, r.defaultAttackMore);
    defaultAttackDamage *= daLess;
    defaultAttackMore += daMore;
    noHeatDecay ||= r.noHeatDecay ?? false;
    critsApplyBleed ||= r.critsApplyBleed ?? false;
    critChanceMultiplier *= r.critChanceMultiplier ?? 1;
    dotLifesteal += r.dotLifesteal ?? 0;
    const [dotLess, dotBonus] = damageSplit(r.dotDamage, r.dotMore);
    dotDamage *= dotLess;
    dotMore += dotBonus;
    lifeMultiplier *= r.lifeMultiplier ?? 1;
    const [hitLess, hitBonus] = damageSplit(r.hitDamage, r.hitMore);
    hitDamage *= hitLess;
    hitMore += hitBonus;
    const [chilledLess, chilledBonus] = damageSplit(r.chilledDamage, r.chilledMore);
    chilledDamage *= chilledLess;
    chilledMore += chilledBonus;
    barrierRecharge *= r.barrierRecharge ?? 1;
    skillDamage += r.skillDamage ?? 0;
    ailmentChance += r.ailmentChance ?? 0;
    ailmentDuration += r.ailmentDuration ?? 0;
    critsApplyAilment ||= r.critsApplyAilment ?? false;
    for (const ailment of new Set([
      ...Object.keys(r.ailmentDamage ?? {}),
      ...Object.keys(r.ailmentMore ?? {}),
    ]) as Set<AilmentType>) {
      const [less, more] = damageSplit(r.ailmentDamage?.[ailment], r.ailmentMore?.[ailment]);
      if (less !== 1) ailmentDamage[ailment] = (ailmentDamage[ailment] ?? 1) * less;
      if (more !== 0) ailmentMore[ailment] = (ailmentMore[ailment] ?? 0) + more;
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
    twinCast.push(...(r.twinCast ?? []));
    if (r.heavyHitCap !== undefined) heavyHitCap = Math.max(heavyHitCap ?? 0, r.heavyHitCap);
    if (r.execute && (!execute || r.execute.bonus > execute.bonus)) execute = r.execute;
  }
  return {
    damageTaken,
    skillCostMultiplier,
    defaultAttackDamage,
    ...(defaultAttackMore ? { defaultAttackMore } : {}),
    noHeatDecay,
    critsApplyBleed,
    critChanceMultiplier,
    ...(dotLifesteal > 0 ? { dotLifesteal } : {}),
    ...(dotDamage !== 1 ? { dotDamage } : {}),
    ...(dotMore ? { dotMore } : {}),
    ...(lifeMultiplier !== 1 ? { lifeMultiplier } : {}),
    ...(hitDamage !== 1 ? { hitDamage } : {}),
    ...(hitMore ? { hitMore } : {}),
    ...(chilledDamage !== 1 ? { chilledDamage } : {}),
    ...(chilledMore ? { chilledMore } : {}),
    ...(barrierRecharge !== 1 ? { barrierRecharge } : {}),
    ...(skillDamage ? { skillDamage } : {}),
    ...(ailmentChance ? { ailmentChance } : {}),
    ...(ailmentDuration ? { ailmentDuration } : {}),
    ...(critsApplyAilment ? { critsApplyAilment } : {}),
    ...(Object.keys(ailmentDamage).length ? { ailmentDamage } : {}),
    ...(Object.keys(ailmentMore).length ? { ailmentMore } : {}),
    ...(Object.keys(maxResistance).length ? { maxResistance } : {}),
    ...(ailmentEcho.length ? { ailmentEcho } : {}),
    ...(twinCast.length ? { twinCast } : {}),
    ...(execute ? { execute } : {}),
    ...(heavyHitCap !== undefined ? { heavyHitCap } : {}),
    ...(conditionalDamage.length ? { conditionalDamage } : {}),
    ...(conditionalCrit.length ? { conditionalCrit } : {}),
    ...(ailmentDamageWhen.length ? { ailmentDamageWhen } : {}),
    ...(conversion.length ? { conversion } : {}),
    ...(fury ? { fury } : {}),
    ...(huntersMark ? { huntersMark } : {}),
    ...(overcharge ? { overcharge } : {}),
    ...(spark ? { spark } : {}),
    ...(lingering ? { lingering } : {}),
    ...(spellblade ? { spellblade } : {}),
    ...(arcaneConduit ? { arcaneConduit } : {}),
    ...(corruptionStopsHeal ? { corruptionStopsHeal } : {}),
    ...(slowDeath ? { slowDeath } : {}),
  };
}
