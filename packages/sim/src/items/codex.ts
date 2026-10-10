import type {
  Item,
  ItemCatalog,
  TriggerAffixDefinition,
  TriggerConditionPart,
  TriggerEffectPart,
} from "./types";

/**
 * Trigger Codex building blocks (docs/design/trigger-codex-v1.md): a kindled trigger is a
 * Condition part plus an Effect part. Every pair is also a regular trigger affix with weight 0
 * and no slots, so it never drops but items, tooltips and fights read it like any other affix.
 */

const KINDLED_PREFIX = "kindled:";

export function kindledAffixId(conditionId: string, effectId: string): string {
  return `${KINDLED_PREFIX}${conditionId}+${effectId}`;
}

/** The trigger affix of a Condition + Effect pair. */
export function kindledAffix(
  condition: TriggerConditionPart,
  effect: TriggerEffectPart,
): TriggerAffixDefinition {
  const chance = condition.chance ?? 1;
  const cooldown = Math.max(condition.cooldown ?? 0, effect.cooldown ?? 0);
  // A chance effect (an ailment) rolls its chance, scaled by how often the condition comes up.
  const value =
    effect.rolls === "chance"
      ? { min: effect.value.min * chance, max: effect.value.max * chance }
      : effect.value;
  return {
    kind: "trigger",
    id: kindledAffixId(condition.id, effect.id),
    name: effect.name,
    slots: [],
    weight: 0,
    tags: [],
    condition: condition.condition,
    ...(effect.rolls === "magnitude" && chance < 1 ? { chance } : {}),
    ...(cooldown > 0 ? { cooldown } : {}),
    ...(condition.oncePerFight ? { oncePerFight: true } : {}),
    effect: effect.effect,
    rolls: effect.rolls,
    value,
    perTier: effect.perTier,
    parts: { condition: condition.id, effect: effect.id },
  };
}

/** All Condition × Effect affixes for a catalog. */
export function kindledAffixes(
  conditions: Iterable<TriggerConditionPart>,
  effects: Iterable<TriggerEffectPart>,
): TriggerAffixDefinition[] {
  const all = [...effects];
  return [...conditions].flatMap((c) => all.map((e) => kindledAffix(c, e)));
}

/** Codex parts an item teaches when salvaged. */
export function codexPartsOf(
  item: Item,
  catalog: ItemCatalog,
): { readonly condition: string; readonly effect: string }[] {
  return item.affixes.flatMap((roll) => {
    const affix = catalog.affixes.get(roll.affixId);
    if (affix?.kind !== "trigger" || !affix.parts) return [];
    return [affix.parts];
  });
}
