import type { CombatEvent } from "./fight";
import type { Side } from "./types";

/** What one fighter's Battle Plan did in a fight ("Plan-Feedback ohne Text"). */
export interface FightReport {
  /** Damage dealt per source (Default Attack or skill name); DoT ticks count as "Ailments". */
  readonly damage: readonly { readonly source: string; readonly damage: number }[];
  readonly total: number;
  /** Casts per Reaction skill name. */
  readonly reactions: readonly { readonly skill: string; readonly casts: number }[];
}

export const AILMENT_SOURCE = "Ailments";

export function fightReport(events: readonly CombatEvent[], side: Side = "hero"): FightReport {
  const damage = new Map<string, number>();
  const reactions = new Map<string, number>();
  const add = (source: string, amount: number) =>
    damage.set(source, (damage.get(source) ?? 0) + amount);
  for (const e of events) {
    if (e.type === "hit" && e.side === side) add(e.source, e.damage);
    else if (e.type === "dot" && e.side !== side) add(AILMENT_SOURCE, e.damage);
    else if (e.type === "skill" && e.side === side && e.via === "reaction") {
      reactions.set(e.skill, (reactions.get(e.skill) ?? 0) + 1);
    }
  }
  const list = [...damage].map(([source, d]) => ({ source, damage: Math.round(d) }));
  return {
    damage: list.sort((a, b) => b.damage - a.damage),
    total: list.reduce((sum, d) => sum + d.damage, 0),
    reactions: [...reactions].map(([skill, casts]) => ({ skill, casts })),
  };
}

/** Share (0–1) of the total damage that came from `source`. */
export function damageShare(report: FightReport, source: string): number {
  if (report.total <= 0) return 0;
  return (report.damage.find((d) => d.source === source)?.damage ?? 0) / report.total;
}
